import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAnalytics } from '../../src/utils/useAnalytics';
import { useSubscription } from '../../src/hooks/useSubscription';
import { useScanCount } from '../../src/hooks/useScanCount';
import { CONFIG } from '../../src/constants/Config';

// imageType determines which slot in referenceImages the photo is stored under.
// This keeps reference photos separate from the user's chosen product display image.
type ImageType = 'nutritionLabel' | 'ingredients' | 'frontOfPack';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { initialMode, initialBarcode, isUpdateMode, imageType: imageTypeParam } = useLocalSearchParams<{
    initialMode?: string;
    initialBarcode?: string;
    isUpdateMode?: string;
    imageType?: ImageType;
  }>();

  const [mode, setMode] = useState<'barcode' | 'nutritionLabel' | 'processing'>('barcode');
  const [currentBarcode, setCurrentBarcode] = useState<string | null>(null);

  // isUpdateMode = true means we are correcting an existing product (calls onOCRUpdate)
  // vs creating a new OCR product (calls onOCRSubmit)
  const isUpdate = isUpdateMode === 'true';
  const resolvedImageType: ImageType = (imageTypeParam as ImageType) || 'nutritionLabel';

  const [processingStep, setProcessingStep] = useState<string>('');

  // Tab screens stay mounted — react to incoming params so the result screen
  // can deep-link us straight into nutrition-label mode with a pre-filled barcode.
  useEffect(() => {
    if (initialMode === 'nutritionLabel') {
      setCurrentBarcode(initialBarcode || null);
      setMode('nutritionLabel');
    }
  }, [initialMode, initialBarcode]);

  const cameraRef = useRef<CameraView>(null);
  const limitAlertShown = useRef(false);
  const router = useRouter();
  const analytics = useAnalytics();
  
  const { isPro } = useSubscription();
  const { count } = useScanCount();

  if (!permission) {
    return <View />;
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  const checkLimit = () => {
    if (!isPro && count >= CONFIG.FREE_SCAN_LIMIT) {
      // Guard: only show the alert once until the user dismisses it and tries again.
      if (limitAlertShown.current) return false;
      limitAlertShown.current = true;

      Alert.alert(
        'Scan Limit Reached',
        `You have reached your daily limit of ${CONFIG.FREE_SCAN_LIMIT} scans. Upgrade to Pro for unlimited access and deep clinical insights.`,
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => { limitAlertShown.current = false; },
          },
          {
            text: 'Upgrade to Pro',
            onPress: () => {
              limitAlertShown.current = false;
              router.push('/paywall');
            },
          },
        ]
      );
      return false;
    }
    return true;
  };

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (mode !== 'barcode') return;
    if (!checkLimit()) return;

    setMode('processing');
    setCurrentBarcode(data);
    analytics.trackBarcodeDetected({ barcode: data, format: type });
    
    try {
      const result = await functions().httpsCallable('onScanProduct')({ barcode: data });
      const resultData = result.data as any;

      if (resultData.found === false) {
        // Product not found in OFF or local cache — prompt for label scan
        Alert.alert(
          'Product Not Found',
          'This product is not in our database. Please take a photo of the Nutrition Label to analyze it.',
          [{ text: 'OK', onPress: () => setMode('nutritionLabel') }]
        );
      } else if (resultData.isIncomplete) {
        // Product found in OFF but has no nutritional data — guide user to scan label
        Alert.alert(
          'Nutrition Data Missing',
          'This product was found, but its nutritional data is incomplete. Scan the nutrition label for an accurate health analysis.',
          [
            {
              text: 'Scan Label',
              onPress: () => {
                setCurrentBarcode(data);
                setMode('nutritionLabel');
              },
            },
            {
              text: 'View Anyway',
              style: 'cancel',
              onPress: () => {
                router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(resultData) } });
                setMode('barcode');
              },
            },
          ]
        );
      } else {
        // Normal successful scan
        router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(result.data) } });
        setMode('barcode');
      }
    } catch (e) {
      setMode('barcode');
      Alert.alert('Error', 'Failed to lookup product.');
    }
  };

  const uploadToStorage = async (uri: string, barcode: string, imgType: ImageType) => {
    // Reference images use typed paths so we know their purpose.
    // productImageUrl is a separate field set only when user explicitly picks a gallery photo.
    const path = `${barcode}/ref_${imgType}.jpg`;
    const reference = storage().ref(path);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const captureImage = async () => {
    if (!cameraRef.current) return;

    // Scan-limit check only for NEW scans, not for corrections
    if (!isUpdate && !checkLimit()) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo) throw new Error('Failed to take photo');

      if (mode === 'nutritionLabel') {
        const barcode = currentBarcode || `manual-${Date.now()}`;
        
        const runUploadAndSubmit = async (useAiOnly: boolean) => {
          try {
            setMode('processing');
            // 1. Upload image to Storage under a typed reference path
            setProcessingStep('Securing image upload...');
            const labelUrl = await uploadToStorage(photo.uri, barcode, resolvedImageType);

            let extractedText = '';
            // 2. On-device OCR (only if not AI Only)
            if (!useAiOnly) {
              setProcessingStep('Extracting nutritional text...');
              const result = await TextRecognition.recognize(photo.uri);
              if (!result.text) {
                throw new Error('No text detected in nutrition label.');
              }
              extractedText = result.text;
            }

            // 3. Submit to server — use onOCRUpdate for corrections, onOCRSubmit for new products
            setProcessingStep('Analyzing data with Clinical AI...');

            let response;
            if (isUpdate && currentBarcode) {
              response = await functions().httpsCallable('onOCRUpdate')({
                barcode: currentBarcode,
                ocrText: extractedText,
                labelImageUrl: labelUrl,
                imageType: resolvedImageType,
                useAiOnly,
              });
            } else {
              response = await functions().httpsCallable('onOCRSubmit')({
                barcode,
                ocrText: extractedText,
                labelImageUrl: labelUrl,
                imageType: resolvedImageType,
                useAiOnly,
              });
            }
            
            router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(response.data) } });
            setMode('barcode');
            setProcessingStep('');
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to process image');
            setMode('nutritionLabel');
            setProcessingStep('');
          }
        };

        if (__DEV__) {
          Alert.alert(
            'Debug Mode: Label Scan',
            'How would you like to process this label?',
            [
              { text: 'OCR + AI', onPress: () => runUploadAndSubmit(false) },
              { text: 'AI Only', onPress: () => runUploadAndSubmit(true) },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else {
          // Release mode defaults strictly to AI Only (skips local OCR)
          await runUploadAndSubmit(true);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to capture image');
      setMode('barcode');
    }
  };

  const processingTitle = isUpdate ? 'Updating Product...' : 'Analyzing...';
  const processingSubtext = isUpdate ? 'Merging new scan with existing data' : 'Consulting clinical databases';

  return (
    <SafeAreaView style={styles.container}>
      {mode === 'processing' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 24 }} />
          <Text style={styles.title}>{processingTitle}</Text>
          <Text style={styles.text}>{processingStep || processingSubtext}</Text>
        </View>
      ) : (
        <View style={styles.camContainer}>
          <CameraView 
            style={styles.camera} 
            facing="back"
            ref={cameraRef}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'upc_a', 'upc_e', 'ean8'],
            }}
            onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
          >
            <View style={styles.overlay}>
              <View style={styles.header}>
                <Text style={styles.overlayTitle}>
                  {mode === 'barcode'
                    ? 'Scan Product Barcode'
                    : isUpdate
                    ? 'Scan Nutrition Label to Fix Data'
                    : 'Take photo of the NUTRITION LABEL'}
                </Text>
                {isUpdate && (
                  <Text style={styles.overlaySubtitle}>
                    This will update the existing product with new nutritional data
                  </Text>
                )}
              </View>

              <View style={[styles.focusFrame, { height: mode === 'barcode' ? frameSize * 0.6 : frameSize }]} />

              <View style={styles.footer}>
                {mode === 'nutritionLabel' && (
                  <TouchableOpacity style={styles.captureBtn} onPress={captureImage}>
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                )}
                <Button 
                    title="Cancel" 
                    variant="tertiary" 
                    textStyle={{ color: '#ffffff' }}
                    onPress={() => {
                      if (mode === 'barcode') router.back();
                      else setMode('barcode');
                    }}
                    style={{ marginTop: 24 }}
                  />
              </View>
            </View>
          </CameraView>
        </View>
      )}
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const frameSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.headlineMd,
    color: theme.colors.onSurface,
    fontWeight: '800',
    marginBottom: theme.spacing[2],
  },
  text: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
  },
  camContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  overlayTitle: {
    color: '#fff',
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    fontWeight: '700',
    textAlign: 'center',
  },
  overlaySubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    textAlign: 'center',
    lineHeight: 20,
  },
  focusFrame: {
    width: frameSize,
    borderWidth: 2,
    borderColor: theme.colors.primaryContainer,
    borderRadius: theme.rounding.lg,
    backgroundColor: 'transparent',
  },
  footer: {
    alignItems: 'center',
    height: 120,
    justifyContent: 'center',
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  }
});
