/**
 * Redeem Screen — Enter points to redeem and generate QR code
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { userAPI } from '../../services/api';

export default function RedeemScreen({ navigation }: any) {
  const [points, setPoints] = useState('');
  const [availablePoints, setAvailablePoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [qrData, setQrData] = useState<{
    qr_id: string;
    house_id: string;
    points_redeemed: number;
  } | null>(null);

  useEffect(() => {
    fetchAvailablePoints();
  }, []);

  const fetchAvailablePoints = async () => {
    try {
      const response = await userAPI.getDashboard();
      setAvailablePoints(response.data.total_points);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch available points');
    } finally {
      setIsFetching(false);
    }
  };

  const handleRedeem = async () => {
    const pointsNum = parseFloat(points);

    if (isNaN(pointsNum) || pointsNum <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of points');
      return;
    }

    if (pointsNum > availablePoints) {
      Alert.alert(
        'Insufficient Points',
        `You only have ${availablePoints.toFixed(2)} points available`
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await userAPI.redeemPoints(pointsNum);
      const { qr_id, house_id, points_redeemed } = response.data;

      setQrData({ qr_id, house_id, points_redeemed });
      setAvailablePoints((prev) => prev - points_redeemed);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Redemption failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setQrData(null);
    setPoints('');
  };

  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Available Points */}
      <View style={styles.availableCard}>
        <Text style={styles.availableLabel}>Available Points</Text>
        <Text style={styles.availableValue}>{availablePoints.toFixed(2)}</Text>
      </View>

      {qrData ? (
        /* QR Code Display */
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Your Redemption QR Code</Text>
          <Text style={styles.qrSubtitle}>
            Present this QR code to a Green Army member to redeem
          </Text>

          <View style={styles.qrContainer}>
            <View style={styles.qrBackground}>
              <QRCode
                value={JSON.stringify(qrData)}
                size={220}
                backgroundColor="#ffffff"
                color="#000000"
              />
            </View>
          </View>

          <View style={styles.qrDetails}>
            <View style={styles.qrDetailRow}>
              <Text style={styles.qrDetailLabel}>QR ID</Text>
              <Text style={styles.qrDetailValue} numberOfLines={1}>
                {qrData.qr_id.substring(0, 18)}...
              </Text>
            </View>
            <View style={styles.qrDetailRow}>
              <Text style={styles.qrDetailLabel}>House ID</Text>
              <Text style={styles.qrDetailValue}>{qrData.house_id}</Text>
            </View>
            <View style={styles.qrDetailRow}>
              <Text style={styles.qrDetailLabel}>Points to Redeem</Text>
              <Text style={[styles.qrDetailValue, { color: Colors.accent }]}>
                {qrData.points_redeemed.toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            id="new-redemption-btn"
            style={styles.newRedemptionBtn}
            onPress={resetForm}
          >
            <Text style={styles.newRedemptionText}>Create New Redemption</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Redemption Form */
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Redeem Your Points</Text>
          <Text style={styles.formSubtitle}>
            Enter the number of points you'd like to redeem. A QR code will be generated for you.
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Points to Redeem</Text>
            <TextInput
              id="redeem-points-input"
              style={styles.input}
              placeholder="e.g., 10.00"
              placeholderTextColor={Colors.textMuted}
              value={points}
              onChangeText={setPoints}
              keyboardType="numeric"
            />
          </View>

          {/* Quick select buttons */}
          <View style={styles.quickSelect}>
            {[25, 50, 75, 100].map((pct) => {
              const val = ((availablePoints * pct) / 100).toFixed(2);
              return (
                <TouchableOpacity
                  key={pct}
                  style={styles.quickBtn}
                  onPress={() => setPoints(val)}
                >
                  <Text style={styles.quickBtnText}>{pct}%</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            id="generate-qr-btn"
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleRedeem}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Text style={styles.submitText}>Generate QR Code</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  availableCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  availableLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  availableValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.accent,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formTitle: {
    ...Typography.heading2,
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
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
    fontSize: 20,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  quickSelect: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  quickBtnText: {
    color: Colors.primaryLight,
    fontWeight: '600',
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qrTitle: {
    ...Typography.heading3,
    marginBottom: Spacing.xs,
  },
  qrSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  qrContainer: {
    marginBottom: Spacing.lg,
  },
  qrBackground: {
    backgroundColor: '#ffffff',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  qrDetails: {
    width: '100%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  qrDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  qrDetailLabel: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  qrDetailValue: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '600',
  },
  newRedemptionBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  newRedemptionText: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
});
