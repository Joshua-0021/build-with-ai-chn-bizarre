/**
 * Green Army Dashboard — Upload waste images, review AI results, edit & confirm points
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
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { greenArmyAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DraftResult {
  house_id: string;
  waste_data: Record<string, number>;
  image_ref: string;
}

interface ClassificationResult {
  house_id: string;
  waste_data: Record<string, number>;
  points_added: number;
  total_points: number;
  message: string;
}

interface Transaction {
  house_id: string;
  worker_id: string;
  waste_data: Record<string, number>;
  points_added: number;
  created_at: string;
}

// ─── Waste metadata ───────────────────────────────────────────────────────────

const WASTE_TYPES = ['plastic', 'metal', 'paper', 'glass', 'organic', 'ewaste', 'textile'];

const wasteIcons: Record<string, string> = {
  plastic: '🧴',
  metal: '🔩',
  paper: '📄',
  glass: '🫙',
  organic: '🌱',
  ewaste: '🔋',
  textile: '👕',
};

const POINT_VALUES: Record<string, number> = {
  plastic: 0.01,
  metal: 0.02,
  paper: 0.005,
  glass: 0.015,
  organic: 0.003,
  ewaste: 0.05,
  textile: 0.008,
};

// Approximate client-side point preview
const previewPoints = (wasteData: Record<string, number>): number => {
  let total = 0;
  for (const [type, qty] of Object.entries(wasteData)) {
    const rate = POINT_VALUES[type.toLowerCase()] ?? 0.005;
    total += qty * rate;
  }
  return Math.round(total * 10000) / 10000;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function GreenArmyDashboard({ navigation }: any) {
  const { user, logout } = useAuth();

  // Step 1 state
  const [houseId, setHouseId] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [isClassifying, setIsClassifying] = useState(false);

  // Step 2 (edit) state
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [editedWaste, setEditedWaste] = useState<Record<string, number>>({});
  const [isConfirming, setIsConfirming] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newType, setNewType] = useState('');
  const [newQty, setNewQty] = useState('1');

  // Final result & history
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // ── History ──────────────────────────────────────────────────────────────

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await greenArmyAPI.getTransactions();
      setTransactions(response.data);
    } catch (error: any) {
      if (error?.response?.status === 401) await logout();
    } finally {
      setIsLoadingHistory(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener('focus', () => fetchTransactions());
    return unsubscribe;
  }, [navigation, fetchTransactions]);

  // ── Image Pickers ─────────────────────────────────────────────────────────

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Camera roll access is required.'); return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setImageName(res.assets[0].fileName || 'waste_image.jpg');
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Camera access is required.'); return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setImageName(res.assets[0].fileName || 'waste_photo.jpg');
    }
  };

  // ── Step 1: Classify Only ─────────────────────────────────────────────────

  const handleClassify = async () => {
    if (!houseId.trim()) { Alert.alert('Error', 'Please enter a House ID'); return; }
    if (!imageUri) { Alert.alert('Error', 'Please select or take a photo'); return; }

    setIsClassifying(true);
    setDraft(null);
    setResult(null);

    try {
      const response = await greenArmyAPI.classifyOnly(houseId.trim(), imageUri, imageName);
      const draftData: DraftResult = response.data;
      setDraft(draftData);
      setEditedWaste({ ...draftData.waste_data });
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Classification failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsClassifying(false);
    }
  };

  // ── Step 2 edit helpers ───────────────────────────────────────────────────

  const adjustQty = (type: string, delta: number) => {
    setEditedWaste(prev => {
      const next = { ...prev };
      const newVal = (next[type] ?? 0) + delta;
      if (newVal <= 0) {
        delete next[type];
      } else {
        next[type] = newVal;
      }
      return next;
    });
  };

  const removeType = (type: string) => {
    setEditedWaste(prev => {
      const next = { ...prev };
      delete next[type];
      return next;
    });
  };

  const handleAddType = () => {
    const t = newType.trim().toLowerCase();
    const q = parseInt(newQty, 10);
    if (!t) { Alert.alert('Error', 'Enter a waste type name'); return; }
    if (isNaN(q) || q <= 0) { Alert.alert('Error', 'Enter a valid quantity'); return; }
    setEditedWaste(prev => ({ ...prev, [t]: (prev[t] ?? 0) + q }));
    setNewType('');
    setNewQty('1');
    setShowAddModal(false);
  };

  // ── Step 2: Confirm ───────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!draft) return;
    if (Object.keys(editedWaste).length === 0) {
      Alert.alert('Error', 'Waste data cannot be empty');
      return;
    }

    setIsConfirming(true);
    try {
      const response = await greenArmyAPI.confirmWaste(draft.house_id, editedWaste, draft.image_ref);
      setResult(response.data);
      setDraft(null);
      fetchTransactions();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Could not assign points. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsConfirming(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setHouseId('');
    setImageUri(null);
    setImageName('');
    setDraft(null);
    setEditedWaste({});
    setResult(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const pointsPreview = previewPoints(editedWaste);

  // ── Render ────────────────────────────────────────────────────────────────

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

        {/* ── STEP 1: Upload Form (only shown when no draft and no result) ── */}
        {!draft && !result && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>📸 Classify Waste</Text>

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

            {imageUri && (
              <View style={styles.imagePreview}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => { setImageUri(null); setImageName(''); }}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

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
                <Text style={styles.submitText}>🤖 Identify Waste</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 2: Review & Edit ── */}
        {draft && !result && (
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>✏️ Review & Edit</Text>
            <Text style={styles.editSubtitle}>
              AI identified these items for <Text style={{ color: Colors.primary }}>🏠 {draft.house_id}</Text>.
              {'\n'}Adjust quantities or remove incorrect items before confirming.
            </Text>

            {/* Editable waste items */}
            {Object.keys(editedWaste).length === 0 ? (
              <Text style={styles.emptyEditText}>No items — add at least one waste type below.</Text>
            ) : (
              Object.entries(editedWaste).map(([type, qty]) => (
                <View key={type} style={styles.editRow}>
                  <Text style={styles.editIcon}>{wasteIcons[type] || '♻️'}</Text>
                  <View style={styles.editInfo}>
                    <Text style={styles.editType}>{type}</Text>
                    <Text style={styles.editRate}>
                      {(POINT_VALUES[type] ?? 0.005).toFixed(3)} pts each
                    </Text>
                  </View>
                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      id={`minus-${type}-btn`}
                      style={styles.qtyBtn}
                      onPress={() => adjustQty(type, -1)}
                    >
                      <Text style={styles.qtyBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{qty}</Text>
                    <TouchableOpacity
                      id={`plus-${type}-btn`}
                      style={styles.qtyBtn}
                      onPress={() => adjustQty(type, 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    id={`remove-${type}-btn`}
                    style={styles.removeTypeBtn}
                    onPress={() => removeType(type)}
                  >
                    <Text style={styles.removeTypeBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {/* Add type button */}
            <TouchableOpacity
              id="add-waste-type-btn"
              style={styles.addTypeBtn}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addTypeBtnText}>+ Add Waste Type</Text>
            </TouchableOpacity>

            {/* Points preview */}
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>Estimated Points</Text>
              <Text style={styles.previewValue}>+{pointsPreview.toFixed(4)}</Text>
            </View>

            {/* Action buttons */}
            <TouchableOpacity
              id="confirm-btn"
              style={[styles.confirmBtn, isConfirming && styles.submitBtnDisabled]}
              onPress={handleConfirm}
              disabled={isConfirming}
              activeOpacity={0.8}
            >
              {isConfirming ? (
                <View style={styles.classifyingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.confirmBtnText}> Assigning Points...</Text>
                </View>
              ) : (
                <Text style={styles.confirmBtnText}>✅ Confirm & Assign Points</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity id="cancel-edit-btn" style={styles.cancelBtn} onPress={resetForm}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: Final Result ── */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>✅ Points Assigned!</Text>

            <View style={styles.resultGrid}>
              {Object.entries(result.waste_data).map(([type, count]) => (
                <View key={type} style={styles.resultItem}>
                  <Text style={styles.resultItemIcon}>{wasteIcons[type] || '♻️'}</Text>
                  <Text style={styles.resultItemType}>{type}</Text>
                  <Text style={styles.resultItemCount}>× {count}</Text>
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
                      <Text style={styles.chipText}>{wasteIcons[type] || '♻️'} {type} × {count}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.historyDate}>{formatDate(txn.created_at)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Add Waste Type Modal ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Waste Type</Text>

            <Text style={styles.label}>Waste Type</Text>
            <View style={styles.typeChipRow}>
              {WASTE_TYPES.filter(t => !editedWaste[t]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, newType === t && styles.typeChipSelected]}
                  onPress={() => setNewType(t)}
                >
                  <Text style={[styles.typeChipText, newType === t && styles.typeChipTextSelected]}>
                    {wasteIcons[t]} {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: Spacing.sm }]}>Or type manually</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. rubber"
              placeholderTextColor={Colors.textMuted}
              value={newType}
              onChangeText={setNewType}
              autoCapitalize="none"
            />

            <Text style={[styles.label, { marginTop: Spacing.sm }]}>Quantity</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={Colors.textMuted}
              value={newQty}
              onChangeText={setNewQty}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity id="modal-cancel-btn" style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity id="modal-add-btn" style={styles.confirmBtn} onPress={handleAddType}>
                <Text style={styles.confirmBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingTop: Spacing.xxl + Spacing.lg },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  greeting: { ...Typography.caption, color: Colors.primaryLight },
  userName: { ...Typography.heading2 },
  logoutBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.borderLight },
  logoutText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500' },

  // Step 1 Form
  formCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.card, borderWidth: 1, borderColor: Colors.border },
  formTitle: { ...Typography.heading3, marginBottom: Spacing.md },
  inputGroup: { marginBottom: Spacing.md },
  label: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.xs },
  input: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  imagePickerRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  imageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.borderLight, gap: Spacing.xs },
  imageBtnIcon: { fontSize: 20 },
  imageBtnText: { color: Colors.textSecondary, fontWeight: '500' },
  imagePreview: { position: 'relative', marginBottom: Spacing.md, borderRadius: BorderRadius.md, overflow: 'hidden' },
  previewImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: BorderRadius.md },
  removeImageBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  removeImageText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', ...Shadows.glow },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: Colors.background, fontSize: 16, fontWeight: '700' },
  classifyingRow: { flexDirection: 'row', alignItems: 'center' },

  // Step 2 Edit card
  editCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.card, borderWidth: 1, borderColor: Colors.primaryLight },
  editTitle: { ...Typography.heading3, marginBottom: Spacing.xs },
  editSubtitle: { ...Typography.bodySmall, color: Colors.textSecondary, marginBottom: Spacing.lg },
  emptyEditText: { color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md, fontStyle: 'italic' },

  editRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  editIcon: { fontSize: 26, width: 34, textAlign: 'center' },
  editInfo: { flex: 1 },
  editType: { fontSize: 15, fontWeight: '600', color: Colors.text, textTransform: 'capitalize' },
  editRate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  qtyValue: { fontSize: 16, fontWeight: '700', color: Colors.text, minWidth: 28, textAlign: 'center' },

  removeTypeBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  removeTypeBtnText: { fontSize: 18 },

  addTypeBtn: { marginTop: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primaryLight, alignItems: 'center', borderStyle: 'dashed' },
  addTypeBtnText: { color: Colors.primaryLight, fontWeight: '600', fontSize: 14 },

  previewBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.lg },
  previewLabel: { ...Typography.body, color: Colors.textSecondary },
  previewValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  confirmBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', marginTop: Spacing.md, ...Shadows.glow },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { marginTop: Spacing.sm, alignItems: 'center', paddingVertical: Spacing.sm },
  cancelBtnText: { color: Colors.textMuted, fontWeight: '500' },

  // Step 3 result
  resultCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.card, borderWidth: 1, borderColor: Colors.success },
  resultTitle: { ...Typography.heading3, marginBottom: Spacing.md, color: Colors.success },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  resultItem: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', minWidth: 80 },
  resultItemIcon: { fontSize: 24, marginBottom: 4 },
  resultItemType: { fontSize: 12, color: Colors.textSecondary, textTransform: 'capitalize', marginBottom: 2 },
  resultItemCount: { fontSize: 16, fontWeight: '700', color: Colors.text },
  resultPointsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  resultPointsLabel: { ...Typography.body, color: Colors.textSecondary },
  resultPointsValue: { fontSize: 18, fontWeight: '700', color: Colors.success },
  newBtn: { marginTop: Spacing.md, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.primaryLight },
  newBtnText: { color: Colors.primaryLight, fontWeight: '600' },

  // Scanner button
  scannerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.secondary, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, marginBottom: Spacing.lg, ...Shadows.card },
  scannerBtnIcon: { fontSize: 22 },
  scannerBtnText: { color: Colors.background, fontSize: 16, fontWeight: '700' },

  // History
  section: { marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.heading3, marginBottom: Spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.sm },
  emptyText: { ...Typography.bodySmall, color: Colors.textMuted },
  historyCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  historyHouse: { ...Typography.body, fontWeight: '600' },
  historyPoints: { fontSize: 16, fontWeight: '700', color: Colors.success },
  wasteChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: Spacing.xs },
  wasteChip: { backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  chipText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
  historyDate: { fontSize: 11, color: Colors.textMuted },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xl, paddingBottom: Spacing.xxl },
  modalTitle: { ...Typography.heading3, marginBottom: Spacing.md },
  typeChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  typeChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceLight },
  typeChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  typeChipTextSelected: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
