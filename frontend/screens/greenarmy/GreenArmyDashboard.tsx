/**
 * Green Army Dashboard — Upload waste images, classify, and assign points
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { greenArmyAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface ClassificationResult {
  house_id: string;
  waste_data: Record<string, number>;
  points_added: number;
  total_points: number;
}

interface Transaction {
  house_id: string;
  worker_id: string;
  waste_data: Record<string, number>;
  points_added: number;
  created_at: string;
}

export default function GreenArmyDashboard({ navigation }: any) {
  const { user, logout } = useAuth();
  const [houseId, setHouseId] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await greenArmyAPI.getTransactions();
      setTransactions(response.data);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await logout();
      }
    } finally {
      setIsLoadingHistory(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener('focus', () => {
      fetchTransactions();
    });
    return unsubscribe;
  }, [navigation, fetchTransactions]);

  const pickImage = async () => {
    const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission Denied', 'Camera roll access is required to upload waste images.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setImageUri(asset.uri);
      setImageName(asset.fileName || 'waste_image.jpg');
    }
  };

  const takePhoto = async () => {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      Alert.alert('Permission Denied', 'Camera access is required to take photos.');
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      const asset = pickerResult.assets[0];
      setImageUri(asset.uri);
      setImageName(asset.fileName || 'waste_photo.jpg');
    }
  };

  const handleClassify = async () => {
    if (!houseId.trim()) {
      Alert.alert('Error', 'Please enter a House ID');
      return;
    }
    if (!imageUri) {
      Alert.alert('Error', 'Please select or take a photo of the waste');
      return;
    }

    setIsClassifying(true);
    setResult(null);

    try {
      const response = await greenArmyAPI.classifyWaste(houseId.trim(), imageUri, imageName);
      setResult(response.data);
      fetchTransactions(); // Refresh history
      Alert.alert('Success', response.data.message);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Classification failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsClassifying(false);
    }
  };

  const resetForm = () => {
    setHouseId('');
    setImageUri(null);
    setImageName('');
    setResult(null);
  };

  const wasteIcons: Record<string, string> = {
    plastic: '🧴',
    metal: '🔩',
    paper: '📄',
    glass: '🫙',
    organic: '🌱',
    ewaste: '🔋',
    textile: '👕',
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTransactions(); }} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Green Army</Text>
            <Text style={styles.userName}>{user?.house_id} 🌿</Text>
          </View>
          <TouchableOpacity id="ga-logout-btn" style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Classification Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Classify Waste</Text>

          {/* House ID Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Household ID</Text>
            <TextInput
              id="ga-house-id-input"
              style={styles.input}
              placeholder="Enter the household's ID"
              placeholderTextColor={Colors.textMuted}
              value={houseId}
              onChangeText={setHouseId}
              autoCapitalize="none"
            />
          </View>

          {/* Image Picker */}
          <Text style={styles.label}>Waste Image</Text>
          <View style={styles.imagePickerRow}>
            <TouchableOpacity id="pick-image-btn" style={styles.imageBtn} onPress={pickImage}>
              <Text style={styles.imageBtnIcon}>🖼️</Text>
              <Text style={styles.imageBtnText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity id="take-photo-btn" style={styles.imageBtn} onPress={takePhoto}>
              <Text style={styles.imageBtnIcon}>📷</Text>
              <Text style={styles.imageBtnText}>Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Image Preview */}
          {imageUri && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => { setImageUri(null); setImageName(''); }}
              >
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            id="classify-btn"
            style={[styles.submitBtn, isClassifying && styles.submitBtnDisabled]}
            onPress={handleClassify}
            disabled={isClassifying}
            activeOpacity={0.8}
          >
            {isClassifying ? (
              <View style={styles.classifyingRow}>
                <ActivityIndicator color={Colors.background} size="small" />
                <Text style={styles.submitText}> Analyzing with AI...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>🤖 Classify & Assign Points</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Classification Result */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>✅ Classification Result</Text>

            <View style={styles.resultGrid}>
              {Object.entries(result.waste_data).map(([type, count]) => (
                <View key={type} style={styles.resultItem}>
                  <Text style={styles.resultIcon}>{wasteIcons[type] || '♻️'}</Text>
                  <Text style={styles.resultType}>{type}</Text>
                  <Text style={styles.resultCount}>× {count}</Text>
                </View>
              ))}
            </View>

            <View style={styles.resultPointsRow}>
              <Text style={styles.resultPointsLabel}>Points Added</Text>
              <Text style={styles.resultPointsValue}>+{result.points_added.toFixed(4)}</Text>
            </View>

            <View style={styles.resultPointsRow}>
              <Text style={styles.resultPointsLabel}>User's New Total</Text>
              <Text style={[styles.resultPointsValue, { color: Colors.accent }]}>
                {result.total_points.toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity id="new-classification-btn" style={styles.newBtn} onPress={resetForm}>
              <Text style={styles.newBtnText}>New Classification</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scan QR Button */}
        <TouchableOpacity
          id="open-scanner-btn"
          style={styles.scannerBtn}
          onPress={() => navigation.navigate('Scanner')}
          activeOpacity={0.8}
        >
          <Text style={styles.scannerBtnIcon}>📱</Text>
          <Text style={styles.scannerBtnText}>Scan QR Code to Redeem</Text>
        </TouchableOpacity>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Submission History</Text>

          {isLoadingHistory ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No submissions yet</Text>
            </View>
          ) : (
            transactions.map((txn, index) => (
              <View key={index} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyHouse}>🏠 {txn.house_id}</Text>
                  <Text style={styles.historyPoints}>+{txn.points_added.toFixed(4)}</Text>
                </View>
                <View style={styles.wasteChips}>
                  {Object.entries(txn.waste_data).map(([type, count]) => (
                    <View key={type} style={styles.wasteChip}>
                      <Text style={styles.chipText}>
                        {wasteIcons[type] || '♻️'} {type} × {count}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.historyDate}>{formatDate(txn.created_at)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xxl + Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  greeting: {
    ...Typography.caption,
    color: Colors.primaryLight,
  },
  userName: {
    ...Typography.heading2,
  },
  logoutBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  logoutText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    ...Typography.heading3,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imagePickerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  imageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  imageBtnIcon: {
    fontSize: 20,
  },
  imageBtnText: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  imagePreview: {
    position: 'relative',
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadows.glow,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  classifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  resultTitle: {
    ...Typography.heading3,
    marginBottom: Spacing.md,
    color: Colors.success,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  resultItem: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  resultIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  resultType: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  resultCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  resultPointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resultPointsLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  resultPointsValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  newBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  newBtnText: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  scannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  scannerBtnIcon: {
    fontSize: 22,
  },
  scannerBtnText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.heading3,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  historyHouse: {
    ...Typography.body,
    fontWeight: '600',
  },
  historyPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  wasteChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: Spacing.xs,
  },
  wasteChip: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
