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

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { initialMode, initialBarcode } = useLocalSearchParams<{ initialMode?: string; initialBarcode?: string }>();
  const [mode, setMode] = useState<'barcode' | 'nutritionLabel' | 'processing'>('barcode');
  const [currentBarcode, setCurrentBarcode] = useState<string | null>(null);
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
        Alert.alert('Not Found', 'This product is not in our database. Please take a photo of the Nutrition Label to analyze it.', [
          { text: 'OK', onPress: () => setMode('nutritionLabel') }
        ]);
      } else {
        router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(result.data) } });
        setMode('barcode');
      }
    } catch (e) {
      setMode('barcode');
      Alert.alert('Error', 'Failed to lookup product.');
    }
  };

  const uploadToStorage = async (uri: string, path: string) => {
    const reference = storage().ref(path);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const captureImage = async () => {
    if (!cameraRef.current) return;
    if (!checkLimit()) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo) throw new Error('Failed to take photo');

      if (mode === 'nutritionLabel') {
        setMode('processing');
        const barcode = currentBarcode || `manual-${Date.now()}`;
        
        // 1. Upload images to Storage
        setProcessingStep('Securing image upload...');
        const labelUrl = await uploadToStorage(photo.uri, `${barcode}/label.jpg`);

        // 2. OCR OCR
        setProcessingStep('Extracting nutritional text...');
        const result = await TextRecognition.recognize(photo.uri);
        if (!result.text) {
          throw new Error('No text detected in nutrition label.');
        }

        // 3. Submit to server
        setProcessingStep('Analyzing data with Clinical AI...');
        const response = await functions().httpsCallable('onOCRSubmit')({ 
          barcode, 
          ocrText: result.text,
          labelImageUrl: labelUrl,
          productImageUrl: null
        });
        
        router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(response.data) } });
        setMode('barcode');
        setProcessingStep('');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to process image');
      setMode(mode === 'processing' ? 'nutritionLabel' : mode);
      setProcessingStep('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {mode === 'processing' ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 24 }} />
          <Text style={styles.title}>Analyzing...</Text>
          <Text style={styles.text}>{processingStep || 'Consulting clinical databases'}</Text>
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
                  {mode === 'barcode' ? 'Scan Product Barcode' : 'Take photo of the NUTRITION LABEL'}
                </Text>
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
  },
  overlayTitle: {
    color: '#fff',
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    fontWeight: '700',
    textAlign: 'center',
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
