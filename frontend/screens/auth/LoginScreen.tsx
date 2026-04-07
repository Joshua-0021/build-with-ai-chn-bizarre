/**
 * Login Screen — Role-based authentication with eco-themed UI
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

type AuthMode = 'login' | 'register';
type Role = 'user' | 'greenarmy';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [role, setRole] = useState<Role>('user');
  const [houseId, setHouseId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  const toggleMode = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setMode(mode === 'login' ? 'register' : 'login');
  };

  const handleSubmit = async () => {
    if (!houseId.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        await register(houseId.trim(), password, role);
        Alert.alert('Success', 'Account created! You can now log in.', [
          { text: 'OK', onPress: () => setMode('login') },
        ]);
      } else {
        await login(houseId.trim(), password);
      }
      let message = 'Something went wrong. Please try again.';
      const detail = error?.response?.data?.detail;
      
      if (Array.isArray(detail) && detail.length > 0) {
        // Handle FastAPI validation errors
        message = `${detail[0].loc[detail[0].loc.length - 1]}: ${detail[0].msg}`;
      } else if (typeof detail === 'string') {
        message = detail;
      }
      
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo / Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>♻️</Text>
            <View style={styles.logoGlow} />
          </View>
          <Text style={styles.appName}>PachApp</Text>
          <Text style={styles.tagline}>Recycle. Earn. Redeem.</Text>
        </View>

        {/* Form Card */}
        <Animated.View style={[styles.formCard, { opacity: fadeAnim }]}>
          <Text style={styles.formTitle}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>

          {/* Role Selector */}
          <View style={styles.roleSelector}>
            <TouchableOpacity
              id="role-user-btn"
              style={[styles.roleBtn, role === 'user' && styles.roleBtnActive]}
              onPress={() => setRole('user')}
            >
              <Text style={styles.roleIcon}>🏠</Text>
              <Text style={[styles.roleText, role === 'user' && styles.roleTextActive]}>
                Household
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              id="role-greenarmy-btn"
              style={[styles.roleBtn, role === 'greenarmy' && styles.roleBtnActive]}
              onPress={() => setRole('greenarmy')}
            >
              <Text style={styles.roleIcon}>🌿</Text>
              <Text style={[styles.roleText, role === 'greenarmy' && styles.roleTextActive]}>
                Green Army
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {role === 'user' ? 'House ID' : 'Worker ID'}
            </Text>
            <TextInput
              id="house-id-input"
              style={styles.input}
              placeholder={role === 'user' ? 'Enter your House ID' : 'Enter your Worker ID'}
              placeholderTextColor={Colors.textMuted}
              value={houseId}
              onChangeText={setHouseId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              id="password-input"
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            id="submit-btn"
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Mode */}
          <TouchableOpacity id="toggle-mode-btn" style={styles.toggleBtn} onPress={toggleMode}>
            <Text style={styles.toggleText}>
              {mode === 'login'
                ? "Don't have an account? Register"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  logoIcon: {
    fontSize: 64,
  },
  logoGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 50,
    backgroundColor: Colors.primaryGlow,
  },
  appName: {
    ...Typography.heading1,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  tagline: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
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
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  roleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: Spacing.sm,
  },
  roleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  roleIcon: {
    fontSize: 20,
  },
  roleText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  roleTextActive: {
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
    color: Colors.textSecondary,
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
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
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
  toggleBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  toggleText: {
    color: Colors.primaryLight,
    fontSize: 14,
  },
});
