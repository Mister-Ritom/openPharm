import { getApp } from '@react-native-firebase/app';
import { addDoc, collection, doc, getDocFromServer, getFirestore, runTransaction, serverTimestamp } from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/ui/Button';
import { AppNativeAd } from '../../src/components/ui/AppNativeAd';
import { CONFIG } from '../../src/constants/Config';
import { useAuth } from '../../src/hooks/useAuth';
import { useScanCount } from '../../src/hooks/useScanCount';
import { useSubscription } from '../../src/hooks/useSubscription';
import { theme } from '../../src/theme/designSystem';
import { analyzeProduct, NutritionData } from '../../src/utils/analysisEngine';
import { useAnalytics } from '../../src/utils/useAnalytics';

// imageType determines which slot in referenceImages the photo is stored under.
// This keeps reference photos separate from the user's chosen product display image.
type ImageType = 'nutritionLabel' | 'ingredients' | 'frontOfPack';

// Helper to check if nutrition is empty/incomplete
function isNutritionIncomplete(n: any): boolean {
  if (!n) return true;
  return (n.sugar_g || 0) === 0 &&
         (n.protein_g || 0) === 0 &&
         (n.fat_g || 0) === 0 &&
         (n.sodium_mg || 0) === 0 &&
         (n.energy_kcal || 0) === 0;
}

// Helper to convert OFF format to our Firestore format
function buildProductFromOFF(offProduct: any, barcode: string): Partial<NutritionData> {
  const nutrients = offProduct.nutriments || {};
  return {
    name: offProduct.product_name || 'Unknown Product',
    brand: offProduct.brands || offProduct.brands_tags?.[0] || 'Unknown Brand',
    ingredients: offProduct.ingredients_text ? [offProduct.ingredients_text] : [],
    nutrients: {
      energy_kcal: nutrients['energy-kcal_100g'] || nutrients['energy-kcal'] || nutrients['energy_value'] || 0,
      protein_g: nutrients.proteins_100g || nutrients.proteins || 0,
      fat_g: nutrients.fat_100g || nutrients.fat || 0,
      saturated_fat_g: nutrients['saturated-fat_100g'] || nutrients['saturated-fat'] || 0,
      trans_fat_g: nutrients['trans-fat_100g'] || nutrients['trans-fat'] || 0,
      carbohydrate_g: nutrients.carbohydrates_100g || nutrients.carbohydrates || 0,
      sugar_g: nutrients.sugars_100g || nutrients.sugars || 0,
      sodium_mg: (nutrients.sodium_100g || nutrients.sodium || 0) * 1000, 
    },
    productImageUrl: offProduct.image_url || offProduct.image_front_url || null,
    isEditable: true,
  };
}

// Helper to log scan locally
async function logScanLocally(uid: string | undefined, product: any, grade: string, barcode?: string) {
  if (!uid) return;
  const db = getFirestore(getApp());
  
  // 1. Log to history
  try {
    await addDoc(collection(db, 'users', uid, 'scans'), {
      barcode: barcode || product.barcode || 'manual',
      name: product.name || 'Unknown Product',
      brand: product.brand || 'Unknown Brand',
      rating: grade,
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.error('Failed to log scan history:', e);
  }

  // 2. Increment usage count
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const usageRef = doc(db, 'users', uid, 'usage', 'today'); 
    
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(usageRef);
      if (!docSnap.exists) {
        transaction.set(usageRef, { date: todayStr, count: 1 });
      } else {
        const data = docSnap.data();
        if (data?.date === todayStr) {
          transaction.update(usageRef, { count: data.count + 1 });
        } else {
          transaction.set(usageRef, { date: todayStr, count: 1 });
        }
      }
    });
  } catch (e) {
    console.error('Failed to increment usage:', e);
  }
}

export default function ScanScreen() {
  const isFocused = useIsFocused();
  const [appState, setAppState] = useState(AppState.currentState);
  const [permission, requestPermission] = useCameraPermissions();

  // Listen for AppState changes to re-mount camera when returning from background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  const isCameraActive = isFocused && appState === 'active';
  const { initialMode, initialBarcode, isUpdateMode, imageType: imageTypeParam, rewarded } = useLocalSearchParams<{
    initialMode?: string;
    initialBarcode?: string;
    isUpdateMode?: string;
    imageType?: ImageType;
    rewarded?: string;
  }>();

  const [mode, setMode] = useState<'barcode' | 'nutritionLabel' | 'processing'>(initialMode === 'nutritionLabel' ? 'nutritionLabel' : 'barcode');
  const [processingStep, setProcessingStep] = useState('');
  const [currentBarcode, setCurrentBarcode] = useState<string | null>(initialBarcode || null);
  const [hasRewardedAccess, setHasRewardedAccess] = useState(rewarded === 'true');

  // Sync mode and reset processing state when params change
  useEffect(() => {
    if (initialMode === 'nutritionLabel') {
      setMode('nutritionLabel');
      setCurrentBarcode(initialBarcode || null);
    } else {
      setMode('barcode');
    }
    setProcessingStep('');
  }, [initialMode, initialBarcode]);

  // isUpdateMode = true means we are correcting an existing product (calls onOCRUpdate)
  // vs creating a new OCR product (calls onOCRSubmit)
  const isUpdate = isUpdateMode === 'true';
  const resolvedImageType: ImageType = (imageTypeParam as ImageType) || 'nutritionLabel';

  // Tab screens stay mounted — react to incoming params so the result screen
  // can deep-link us straight into nutrition-label mode with a pre-filled barcode.
  // (Logic consolidated into the useEffect above)

  const cameraRef = useRef<CameraView>(null);
  const limitAlertShown = useRef(false);
  const router = useRouter();
  const analytics = useAnalytics();
  
  const { isPro } = useSubscription();
  const { count } = useScanCount();
  const { user, profile } = useAuth();

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
    if (hasRewardedAccess) return true;
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

    setHasRewardedAccess(false); // Consume the reward access
    setMode('processing');
    setCurrentBarcode(data);
    analytics.trackBarcodeDetected({ barcode: data, format: type });
    
    try {
      const db = getFirestore(getApp());
      
      // 1. Check database
      setProcessingStep('Checking database...');
      const productRef = doc(db, 'products', data);
      const productSnap = await getDocFromServer(productRef);
      
      if (productSnap.exists() && productSnap.data()?.isIncomplete !== true) {
        const productData = {
          ...productSnap.data() as Partial<NutritionData>,
          isEditable: (productSnap.data()?.isEditable !== false),
        };
        const analysis = analyzeProduct(productData, profile);
        await logScanLocally(user?.uid, productData, analysis.grade, data);
        router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(analysis) } });
        setMode('barcode');
        return;
      }

      // 2. Fetch from Open Food Facts
      setProcessingStep('Checking Open Food Facts...');
      const offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${data}.json`);
      const offData = await offResponse.json();

      if (offData.status === 1 && offData.product) {
        const productData = buildProductFromOFF(offData.product, data);
        if (!isNutritionIncomplete(productData.nutrients)) {
          const analysis = analyzeProduct(productData, profile);
          await logScanLocally(user?.uid, productData, analysis.grade, data);
          router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(analysis) } });
          
          // Fire-and-forget: Cache product to Firestore
          functions().httpsCallable('cacheProduct')({ barcode: data, productData }).catch(e => console.log('Background cache failed:', e));
          
          setMode('barcode');
          return;
        }
      }

      // 3. Fallback: Request nutrition label scan
      setMode('barcode');
      const promptTitle = (offData.status === 1 && offData.product) ? 'Nutrition Data Missing' : 'Product Not Found';
      const promptMsg = (offData.status === 1 && offData.product) 
        ? 'This product was found, but its nutritional data is incomplete. Scan the nutrition label for an accurate health analysis.' 
        : 'This product is not in our database. Please take a photo of the Nutrition Label to analyze it.';
        
      Alert.alert(
        promptTitle,
        promptMsg,
        [
          { text: 'Scan Label', onPress: () => { setCurrentBarcode(data); setMode('nutritionLabel'); } },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      
    } catch (e) {
      console.error(e);
      setMode('barcode');
      Alert.alert('Error', 'Failed to lookup product.');
    } finally {
      setProcessingStep('');
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

    if (!isUpdate) setHasRewardedAccess(false); // Consume reward access

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo) throw new Error('Failed to take photo');

      if (mode === 'nutritionLabel') {
        const barcode = currentBarcode || `manual-${Date.now()}`;
        
        const runUploadAndSubmit = async (useAiOnly: boolean) => {
          try {
            setMode('processing');
            // 1. Upload image to Storage under a typed reference path
            setProcessingStep('Preparing image...');
            
            // 1. Precision Cropping based on UI frame
            const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
            const frameWidth = screenWidth * 0.7;
            const currentFrameHeight = frameWidth; // In nutritionLabel mode, it's always a square

            // Calculate ratios between photo and screen
            const scaleX = photo.width / screenWidth;
            const scaleY = photo.height / screenHeight;

            // Calculate base crop boundaries in photo pixels (relative to center)
            const baseOriginX = ((screenWidth - frameWidth) / 2) * scaleX;
            const baseOriginY = ((screenHeight - currentFrameHeight) / 2) * scaleY;
            const baseCropWidth = frameWidth * scaleX;
            const baseCropHeight = currentFrameHeight * scaleY;

            // Add 5% padding for better AI context (avoids cutting off labels)
            const paddingX = baseCropWidth * 0.05;
            const paddingY = baseCropHeight * 0.05;

            const originX = Math.max(0, baseOriginX - paddingX);
            const originY = Math.max(0, baseOriginY - paddingY);
            const cropWidth = Math.min(photo.width - originX, baseCropWidth + (paddingX * 2));
            const cropHeight = Math.min(photo.height - originY, baseCropHeight + (paddingY * 2));

            console.log(`[OCR] Screen: ${screenWidth}x${screenHeight}, Photo: ${photo.width}x${photo.height}`);
            console.log(`[OCR] Cropping photo with padding: ${cropWidth.toFixed(0)}x${cropHeight.toFixed(0)} at (${originX.toFixed(0)}, ${originY.toFixed(0)})`);
            
            // Use the stable manipulateAsync API to ensure we get a valid file URI
            const manipResult = await ImageManipulator.manipulateAsync(
              photo.uri,
              [
                {
                  crop: {
                    originX,
                    originY,
                    width: cropWidth,
                    height: cropHeight,
                  },
                },
                { resize: { width: 720, height: 720 } }
              ],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );

            // 2. Upload the optimized image to Storage
            setProcessingStep('Securing image upload...');
            const labelUrl = await uploadToStorage(manipResult.uri, barcode, resolvedImageType);

            let extractedText = '';
            // 2. On-device OCR (only if not AI Only)
            if (!useAiOnly) {
              setProcessingStep('Extracting nutritional text...');
              // USE THE CROPPED IMAGE (manipResult.uri) for better focus/OCR
              const result = await TextRecognition.recognize(manipResult.uri);
              if (!result.text) {
                console.warn('MLKit: No text detected in cropped label.');
              }
              extractedText = result.text;
            }

            // 3. Submit to server — use onOCRUpdate for corrections, onOCRSubmit for new products
            setProcessingStep('Analyzing data with Clinical AI...');

            let response;
            try {
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
              
              if (__DEV__) {
                console.log('--- AI Response Data ---');
                console.log(response.data);
                console.log('------------------------');
              }
              
              const rawProduct = response.data as Partial<NutritionData>;
              const analysis = analyzeProduct(rawProduct, profile);
              await logScanLocally(user?.uid, rawProduct, analysis.grade, barcode);

              // 4. Navigate only on success
              router.push({ pathname: '/(main)/result', params: { data: JSON.stringify(analysis) } });
              setMode('barcode');
            } catch (err: any) {
              console.error('[OCR Error]', err);
              setMode('barcode'); // Reset mode on error
              // Handle the specific JSON parse error better
              if (err.message?.includes('JSON') || err.message?.includes('character')) {
                throw new Error('The AI response was malformed. This usually happens during server updates. Please try again in 10 seconds.');
              }
              throw err;
            } finally {
              setProcessingStep('');
            }
          } catch (e: any) {
            console.error('OCR Submit Error Detail:', e);
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

          {/* Native ad shown during AI analysis wait — hidden for Pro users */}
          <View style={styles.processingAdContainer}>
            <AppNativeAd isPro={isPro} />
          </View>
        </View>
      ) : (
        <View style={styles.camContainer}>
          {isCameraActive && (
            <CameraView 
              style={styles.camera} 
              facing="back"
              ref={cameraRef}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'upc_a', 'upc_e', 'ean8'],
              }}
              onBarcodeScanned={mode === 'barcode' ? handleBarcodeScanned : undefined}
            />
          )}

          <View style={styles.overlay}>
            {/* Shroud System (Hole Punch) */}
            <View style={styles.shroudContainer}>
              <View style={[styles.shroud, styles.shroudTop]} />
              <View style={styles.shroudMiddle}>
                <View style={[styles.shroud, styles.shroudSide]} />
                <View style={[styles.focusFrame, { height: mode === 'barcode' ? frameSize * 0.6 : frameSize }]} />
                <View style={[styles.shroud, styles.shroudSide]} />
              </View>
              <View style={[styles.shroud, styles.shroudBottom]} />
            </View>

            {/* UI Content */}
            <View style={styles.contentContainer}>
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
          </View>
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
    ...StyleSheet.absoluteFillObject,
  },
  shroudContainer: {
    flex: 1,
  },
  shroud: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  shroudTop: {
    flex: 1,
  },
  shroudMiddle: {
    flexDirection: 'row',
  },
  shroudSide: {
    flex: 1,
  },
  shroudBottom: {
    flex: 1,
  },
  contentContainer: {
    ...StyleSheet.absoluteFillObject,
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
  },
  processingAdContainer: {
    marginTop: 32,
    width: '92%',
    alignSelf: 'center',
  },
});
