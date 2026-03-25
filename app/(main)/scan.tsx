import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';
import { useRouter } from 'expo-router';
import { useAnalytics } from '../../src/utils/useAnalytics';
import { useSubscription } from '../../src/hooks/useSubscription';
import { useScanCount } from '../../src/hooks/useScanCount';
import { CONFIG } from '../../src/constants/Config';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'barcode' | 'productPhoto' | 'nutritionLabel' | 'processing'>('barcode');
  const [currentBarcode, setCurrentBarcode] = useState<string | null>(null);
  const [productPhotoUri, setProductPhotoUri] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);
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
      Alert.alert(
        'Scan Limit Reached',
        `You have reached your daily limit of ${CONFIG.FREE_SCAN_LIMIT} scans. Upgrade to Pro for unlimited access and deep clinical insights.`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Upgrade to Pro', onPress: () => router.push('/paywall') }
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
        Alert.alert('Not Found', 'This product is not in our database. Please help us by taking two photos:\n1. Front of Product\n2. Nutrition Label', [
          { text: 'OK', onPress: () => setMode('productPhoto') }
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

      if (mode === 'productPhoto') {
        setProductPhotoUri(photo.uri);
        setMode('nutritionLabel');
      } else if (mode === 'nutritionLabel') {
        setMode('processing');
        
        const barcode = currentBarcode || `manual-${Date.now()}`;
        
        // 1. Upload images to Storage
        const labelUrl = await uploadToStorage(photo.uri, `${barcode}/label.jpg`);
        let productUrl = null;
        if (productPhotoUri) {
          productUrl = await uploadToStorage(productPhotoUri, `${barcode}/product.jpg`);
        }

        // 2. OCR OCR
        const result = await TextRecognition.recognize(photo.uri);
        if (!result.text) {
          throw new Error('No text detected in nutrition label.');
        }

        // 3. Submit to server
        const response = await functions().httpsCallable('onOCRSubmit')({ 
          barcode, 
          ocrText: result.text,
          labelImageUrl: labelUrl,
          productImageUrl: productUrl
        });
        
        router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(response.data) } });
        setMode('barcode');
        setProductPhotoUri(null);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to process image');
      setMode(mode === 'processing' ? 'nutritionLabel' : mode);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {mode === 'processing' ? (
        <View style={styles.center}>
          <Text style={styles.title}>Analyzing...</Text>
          <Text style={styles.text}>Consulting clinical databases</Text>
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
                  {mode === 'barcode' ? 'Scan Product Barcode' : 
                   mode === 'productPhoto' ? 'Take photo of the PRODUCT FRONT' :
                   'Take photo of the NUTRITION LABEL'}
                </Text>
              </View>

              <View style={[styles.focusFrame, { height: mode === 'barcode' ? frameSize * 0.6 : frameSize }]} />

              <View style={styles.footer}>
                {(mode === 'nutritionLabel' || mode === 'productPhoto') && (
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
