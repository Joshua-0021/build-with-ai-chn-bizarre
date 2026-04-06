/**
 * User Dashboard Screen — Points overview, transaction history, and redeem action
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { userAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Transaction {
  house_id: string;
  waste_data: Record<string, number>;
  points_added: number;
  created_at: string;
}

export default function UserDashboard({ navigation }: any) {
  const { user, logout } = useAuth();
  const [totalPoints, setTotalPoints] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await userAPI.getDashboard();
      setTotalPoints(response.data.total_points);
      setTransactions(response.data.transactions);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        await logout();
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Refresh when screen focuses
  useEffect(() => {
    const unsubscribe = navigation?.addListener('focus', () => {
      fetchDashboard();
    });
    return unsubscribe;
  }, [navigation, fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.house_id} 🏠</Text>
          </View>
          <TouchableOpacity id="logout-btn" style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Points Card */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsGlow} />
          <Text style={styles.pointsLabel}>Total Reward Points</Text>
          <Text style={styles.pointsValue}>{totalPoints.toFixed(2)}</Text>
          <View style={styles.pointsFooter}>
            <Text style={styles.pointsSubtext}>Keep recycling to earn more!</Text>
          </View>

          {/* Redeem Button */}
          <TouchableOpacity
            id="redeem-points-btn"
            style={styles.redeemBtn}
            onPress={() => navigation.navigate('Redeem')}
            activeOpacity={0.8}
          >
            <Text style={styles.redeemBtnText}>Redeem Points</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Contributions</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No contributions yet</Text>
              <Text style={styles.emptySubtext}>
                Your waste contributions will appear here
              </Text>
            </View>
          ) : (
            transactions.map((txn, index) => (
              <View key={index} style={styles.transactionCard}>
                <View style={styles.txnHeader}>
                  <Text style={styles.txnPoints}>+{txn.points_added.toFixed(4)}</Text>
                  <Text style={styles.txnDate}>{formatDate(txn.created_at)}</Text>
                </View>
                <View style={styles.wasteChips}>
                  {Object.entries(txn.waste_data).map(([type, count]) => (
                    <View key={type} style={styles.wasteChip}>
                      <Text style={styles.chipIcon}>{wasteIcons[type] || '♻️'}</Text>
                      <Text style={styles.chipText}>
                        {type} × {count}
                      </Text>
                    </View>
                  ))}
                </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.bodySmall,
    marginTop: Spacing.md,
  },
  scroll: {
    flex: 1,
  },
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
    ...Typography.bodySmall,
    color: Colors.textMuted,
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
  pointsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  pointsGlow: {
    position: 'absolute',
    top: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primaryGlow,
  },
  pointsLabel: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    color: Colors.textSecondary,
  },
  pointsValue: {
    ...Typography.number,
    marginBottom: Spacing.xs,
  },
  pointsFooter: {
    marginBottom: Spacing.md,
  },
  pointsSubtext: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  redeemBtn: {
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    ...Shadows.card,
  },
  redeemBtnText: {
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
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  transactionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  txnPoints: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  txnDate: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    fontSize: 12,
  },
  wasteChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  wasteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    gap: 4,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
