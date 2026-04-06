/**
 * QR Scanner Screen — Scan and validate QR codes for point redemption
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { qrAPI } from '../../services/api';

interface ScanResult {
  qr_id: string;
  house_id: string;
  points_redeemed: number;
  status: string;
  message: string;
}

export default function ScannerScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!isScanning || isValidating) return;

    setIsScanning(false);
    setIsValidating(true);
    setError(null);

    try {
      // Parse QR data
      const qrPayload = JSON.parse(data);
      const { qr_id, house_id, points_redeemed } = qrPayload;

      if (!qr_id || !house_id || points_redeemed === undefined) {
        throw new Error('Invalid QR code format');
      }

      // Validate via API
      const response = await qrAPI.validate(qr_id, house_id, points_redeemed);
      setScanResult(response.data);
    } catch (err: any) {
      if (err instanceof SyntaxError) {
        setError('Invalid QR code. Not a PachApp redemption code.');
      } else {
        const message = err?.response?.data?.detail || err.message || 'Validation failed';
        setError(message);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const resetScanner = () => {
    setIsScanning(true);
    setScanResult(null);
    setError(null);
  };

  // Web fallback: manual QR data entry
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webFallback}>
          <Text style={styles.webIcon}>📱</Text>
          <Text style={styles.webTitle}>QR Scanner</Text>
          <Text style={styles.webSubtitle}>
            Camera-based QR scanning is available on mobile devices.
            {'\n'}Use the mobile app to scan QR codes.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            PachApp needs camera access to scan QR codes for point redemption.
          </Text>
          <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isScanning && !scanResult && !error ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
          >
            {/* Scanning Overlay */}
            <View style={styles.overlay}>
              <View style={styles.overlayTop} />
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                <View style={styles.scanArea}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              <View style={styles.overlayBottom}>
                <Text style={styles.scanText}>Align QR code within the frame</Text>
              </View>
            </View>
          </CameraView>

          {isValidating && (
            <View style={styles.validatingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.validatingText}>Validating QR Code...</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.resultContainer}>
          {scanResult ? (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Points Redeemed!</Text>

              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>House ID</Text>
                  <Text style={styles.detailValue}>{scanResult.house_id}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Points</Text>
                  <Text style={[styles.detailValue, { color: Colors.accent }]}>
                    {scanResult.points_redeemed.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: Colors.success }]}>
                    {scanResult.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity id="scan-another-btn" style={styles.scanAgainBtn} onPress={resetScanner}>
                <Text style={styles.scanAgainText}>Scan Another QR</Text>
              </TouchableOpacity>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorIcon}>❌</Text>
              <Text style={styles.errorTitle}>Validation Failed</Text>
              <Text style={styles.errorMessage}>{error}</Text>

              <TouchableOpacity id="retry-scan-btn" style={styles.retryBtn} onPress={resetScanner}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(width * 0.7, 300);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: 3, borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: 3, borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  scanText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  validatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validatingText: {
    color: Colors.text,
    marginTop: Spacing.md,
    fontSize: 16,
    fontWeight: '500',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  successCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  successTitle: {
    ...Typography.heading2,
    color: Colors.success,
    marginBottom: Spacing.lg,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  detailValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  scanAgainBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  scanAgainText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  errorCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.card,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  errorTitle: {
    ...Typography.heading2,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  permissionTitle: {
    ...Typography.heading2,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  grantBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  grantBtnText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  webIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  webTitle: {
    ...Typography.heading2,
    marginBottom: Spacing.sm,
  },
  webSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  backBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  backBtnText: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
});
