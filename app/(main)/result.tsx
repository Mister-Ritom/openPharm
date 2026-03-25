import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/theme/designSystem';
import { Card } from '../../src/components/ui/Card';
import { RatingBadge } from '../../src/components/ui/RatingBadge';
import { Button } from '../../src/components/ui/Button';
import { EditableField } from '../../src/components/ui/EditableField';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';
import { Ionicons } from '@expo/vector-icons';

export default function ResultScreen() {
  const { data } = useLocalSearchParams();
  const router = useRouter();

  if (!data) return <View style={styles.safe} />;
  
  const initialProduct = JSON.parse(data as string);
  const [product, setProduct] = useState(initialProduct);
  const [pendingUpdates, setPendingUpdates] = useState<any>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const isEditable = product.isEditable;
  const rating = product.grade || 'C';
  const nutrients = product.nutrients || {};

  const handleUpdateField = (field: string, value: any, isNutrient = false) => {
    if (isNutrient) {
      const parsedValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      // Optimistic UI Update
      setProduct((prev: any) => ({
        ...prev,
        nutrients: { ...prev.nutrients, [field]: parsedValue }
      }));
      // Queue for background save
      setPendingUpdates((prev: any) => ({
        ...prev,
        nutrients: { ...(prev.nutrients || product.nutrients), [field]: parsedValue }
      }));
    } else {
      // Optimistic UI Update
      setProduct((prev: any) => ({ ...prev, [field]: value }));
      // Queue for background save
      setPendingUpdates((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const pickImage = async () => {
    if (!isEditable) return;
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const localUri = result.assets[0].uri;
      
      // Optimistic UI update instantly shows selected image
      setProduct((prev: any) => ({ ...prev, productImageUrl: localUri }));
      
      setIsUploadingImage(true);
      setSyncStatus('Uploading image...');
      
      try {
        const barcode = product.barcode;
        const reference = storage().ref(`${barcode}/product_custom.jpg`);
        await reference.putFile(localUri);
        const url = await reference.getDownloadURL();
        
        // Queue the final remote URL for the background save
        setPendingUpdates((prev: any) => ({ ...prev, productImageUrl: url }));
      } catch (e) {
        Alert.alert('Upload Failed', 'Could not save the image.');
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  // Reference to hold pending updates for unmount flushing
  const pendingUpdatesRef = useRef(pendingUpdates);
  useEffect(() => {
    pendingUpdatesRef.current = pendingUpdates;
  }, [pendingUpdates]);

  // Flush pending updates when user navigates away (component unmounts)
  useEffect(() => {
    return () => {
      const remainingUpdates = pendingUpdatesRef.current;
      if (Object.keys(remainingUpdates).length > 0) {
        // Fire and forget save on unmount
        functions().httpsCallable('updateProduct')({
          barcode: product.barcode,
          updates: remainingUpdates
        }).catch(err => console.error("Unmount save failed:", err));
      }
    };
  }, [product.barcode]);

  // Background Queue Processor
  useEffect(() => {
    // Prevent saving if there are no pending changes OR if an image upload is actively blocking
    if (Object.keys(pendingUpdates).length === 0 || isUploadingImage) {
      return;
    }

    setSyncStatus('Saving changes...');
    
    const timer = setTimeout(async () => {
      try {
        await functions().httpsCallable('updateProduct')({
          barcode: product.barcode,
          updates: pendingUpdates
        });
        
        // Clear pending updates on success
        setPendingUpdates({});
        setSyncStatus('All changes saved');
        
        // Clear status text after a moment
        setTimeout(() => setSyncStatus(''), 2000);
      } catch (e: any) {
        console.error("Background save failed:", e);
        setSyncStatus('Save failed. Retrying in background...');
      }
    }, 4000); // 4-second debounce to batch consecutive user edits

    return () => clearTimeout(timer);
  }, [pendingUpdates, isUploadingImage, product.barcode]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.header}>
          <Button variant="tertiary" title="Close" onPress={() => router.back()} style={styles.closeBtn} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.dataSourceLabel}>{product.dataSource || 'System'} Result</Text>
            {!!syncStatus && <Text style={styles.syncStatusText}>{syncStatus}</Text>}
          </View>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.productIconRow}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={pickImage} 
              disabled={!isEditable || isUploadingImage}
              style={styles.iconContainer}
            >
              {product.productImageUrl ? (
                <Image source={{ uri: product.productImageUrl }} style={styles.productIcon} />
              ) : (
                <View style={[styles.productIcon, styles.iconPlaceholder]}>
                  <Ionicons name="image-outline" size={32} color={theme.colors.outline} />
                </View>
              )}
              {isEditable && (
                <View style={styles.iconEditBadge}>
                  {isUploadingImage ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={12} color="#fff" />}
                </View>
              )}
            </TouchableOpacity>
            
            <View style={{ flex: 1, marginLeft: theme.spacing[4] }}>
              <EditableField 
                label="Product Name" 
                value={product.name} 
                isEditable={isEditable}
                onSave={(v) => handleUpdateField('name', v)}
              />
              <EditableField 
                label="Brand" 
                value={product.brand} 
                isEditable={isEditable}
                onSave={(v) => handleUpdateField('brand', v)}
              />
            </View>
            <RatingBadge rating={rating} />
          </View>
          
          <Card variant="elevated" style={styles.summaryCard}>
            <Text style={styles.analysisSummary}>
              {product.warnings && product.warnings.length > 0 
                ? `This product has ${product.warnings.length} flags based on your health profile.`
                : 'This product looks safe for your health profile!'}
            </Text>
          </Card>
        </View>

        <Card variant="elevated" style={styles.flagsCard}>
          <Text style={styles.sectionTitle}>Tailored Warnings</Text>
          {product.warnings && product.warnings.length > 0 ? (
            product.warnings.map((warning: any, idx: number) => (
              <View key={idx} style={styles.flagItem}>
                <View style={[styles.flagDot, { backgroundColor: warning.severity === 'high' ? theme.colors.error : theme.colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.flagIngredient}>{warning.ingredient}</Text>
                  <Text style={styles.flagText}>{warning.reason}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No major flags detected based on your active health profile.</Text>
          )}
        </Card>

        <Card style={styles.nutrimentsCard}>
          <Text style={styles.sectionTitle}>Nutrition Details (per 100g)</Text>
          <View style={styles.nutrimentGrid}>
             <View style={styles.nutriItem}>
                <EditableField 
                  label="Energy (kcal)" 
                  value={String(nutrients.energy_kcal || 0)} 
                  isEditable={isEditable} 
                  keyboardType="numeric"
                  onSave={(v) => handleUpdateField('energy_kcal', v, true)}
                />
             </View>
             <View style={styles.nutriItem}>
                <EditableField 
                  label="Protein (g)" 
                  value={String(nutrients.protein_g || 0)} 
                  isEditable={isEditable} 
                  keyboardType="numeric"
                  onSave={(v) => handleUpdateField('protein_g', v, true)}
                />
             </View>
             <View style={styles.nutriItem}>
                <EditableField 
                  label="Carbs (g)" 
                  value={String(nutrients.carbohydrate_g || 0)} 
                  isEditable={isEditable} 
                  keyboardType="numeric"
                  onSave={(v) => handleUpdateField('carbohydrate_g', v, true)}
                />
             </View>
             <View style={styles.nutriItem}>
                <EditableField 
                  label="Sugars (g)" 
                  value={String(nutrients.sugar_g || 0)} 
                  isEditable={isEditable} 
                  keyboardType="numeric"
                  onSave={(v) => handleUpdateField('sugar_g', v, true)}
                />
             </View>
             <View style={styles.nutriItem}>
                <EditableField 
                  label="Total Fat (g)" 
                  value={String(nutrients.fat_g || 0)} 
                  isEditable={isEditable} 
                  keyboardType="numeric"
                  onSave={(v) => handleUpdateField('fat_g', v, true)}
                />
             </View>
             <View style={styles.nutriItem}>
                <EditableField 
                  label="Sat. Fat (g)" 
                  value={String(nutrients.saturated_fat_g || 0)} 
                  isEditable={isEditable} 
                  keyboardType="numeric"
                  onSave={(v) => handleUpdateField('saturated_fat_g', v, true)}
                />
             </View>
             <View style={styles.nutriItem}>
                <EditableField 
                  label="Sodium (mg)" 
                  value={String(nutrients.sodium_mg || 0)} 
                  isEditable={isEditable} 
                  keyboardType="numeric"
                  onSave={(v) => handleUpdateField('sodium_mg', v, true)}
                />
             </View>
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  container: {
    padding: theme.spacing[6],
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  closeBtn: {
    paddingHorizontal: 0,
  },
  dataSourceLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.outline,
    textTransform: 'uppercase',
  },
  syncStatusText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 10,
    color: theme.colors.primary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  heroSection: {
    marginBottom: theme.spacing[8],
  },
  productIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  iconContainer: {
    position: 'relative',
  },
  productIcon: {
    width: 100,
    height: 100,
    borderRadius: theme.rounding.lg,
    backgroundColor: theme.colors.surfaceContainer,
  },
  iconPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderStyle: 'dashed',
  },
  iconEditBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: theme.colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  summaryCard: {
    marginTop: theme.spacing[4],
    backgroundColor: theme.colors.surfaceContainerLow,
  },
  productName: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.displaySm,
    color: theme.colors.onSurface,
    fontWeight: '800',
    paddingRight: theme.spacing[4],
  },
  brandName: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  analysisSummary: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyLg,
    color: theme.colors.onSurface,
    lineHeight: 28,
  },
  flagsCard: {
    marginBottom: theme.spacing[4],
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.headlineSm,
    color: theme.colors.onSurface,
    fontWeight: '700',
    marginBottom: theme.spacing[4],
  },
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  flagDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    marginRight: theme.spacing[3],
  },
  flagIngredient: {
    fontFamily: theme.typography.fontFamily.headline,
    fontSize: theme.typography.sizes.bodyLg,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  flagText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.outline,
    textAlign: 'center',
    marginVertical: 20,
  },
  nutrimentsCard: {
    marginBottom: theme.spacing[4],
  },
  nutrimentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  nutriItem: {
    width: '48%',
    marginBottom: theme.spacing[2],
  }
});
