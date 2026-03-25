import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { theme } from '../../src/theme/designSystem';
import { Button } from '../../src/components/ui/Button';
import functions from '@react-native-firebase/functions';
import { useRouter } from 'expo-router';
import { useAnalytics } from '../../src/utils/useAnalytics';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'barcode' | 'nutritionLabel' | 'processing'>('barcode');
  const [currentBarcode, setCurrentBarcode] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const analytics = useAnalytics();

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

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (mode !== 'barcode') return;
    setMode('processing');
    setCurrentBarcode(data);
    analytics.trackBarcodeDetected({ barcode: data, format: type });
    
    try {
      const result = await functions().httpsCallable('onScanProduct')({ barcode: data });
      const resultData = result.data as any;
      if (resultData.found === false) {
        Alert.alert('Not Found', `We didn't find ${data} in our global base. Please capture the nutritional label.`, [
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

  const captureNutritionLabel = async () => {
    if (!cameraRef.current) return;
    setMode('processing');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo) throw new Error('Failed to take photo');
      
      const result = await TextRecognition.recognize(photo.uri);
      
      const response = await functions().httpsCallable('onOCRSubmit')({ barcode: currentBarcode, ocrText: result.text });
      router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(response.data) } });
      setMode('barcode');
    } catch (e) {
      Alert.alert('Error', 'Failed to process image');
      setMode('nutritionLabel');
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
                  {mode === 'barcode' ? 'Scan Product Barcode' : 'Take a photo of the Nutrition Label'}
                </Text>
              </View>

              <View style={[styles.focusFrame, { height: mode === 'barcode' ? frameSize * 0.6 : frameSize }]} />

              <View style={styles.footer}>
                {mode === 'nutritionLabel' && (
                  <TouchableOpacity style={styles.captureBtn} onPress={captureNutritionLabel}>
                    <View style={styles.captureInner} />
                  </TouchableOpacity>
                )}
                {mode === 'nutritionLabel' && (
                  <Button 
                    title="Cancel" 
                    variant="tertiary" 
                    textStyle={{ color: '#ffffff' }}
                    onPress={() => setMode('barcode')}
                    style={{ marginTop: 24 }}
                  />
                )}
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
