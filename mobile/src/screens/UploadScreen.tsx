import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { recordsApi } from '../api/endpoints';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

const RECORD_TYPES = [
  { key: 'lab_report',    label: 'Lab Report',     icon: 'flask-outline',        color: '#0066FF' },
  { key: 'prescription',  label: 'Prescription',   icon: 'medical-outline',      color: '#7C3AED' },
  { key: 'scan',          label: 'Scan / X-Ray',   icon: 'body-outline',         color: '#00C48C' },
  { key: 'discharge',     label: 'Discharge Summary', icon: 'document-text-outline', color: '#F59E0B' },
  { key: 'vaccination',   label: 'Vaccination',    icon: 'shield-checkmark-outline', color: '#EF4444' },
  { key: 'other',         label: 'Other',          icon: 'attach-outline',       color: '#64748B' },
];

interface FileAsset {
  uri: string;
  name?: string;
  type?: string;
  size?: number;
}

export function UploadScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [recordType, setRecordType] = useState('lab_report');
  const [file, setFile]             = useState<FileAsset | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [result, setResult]         = useState<any>(null);

  const requestCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to scan documents.'); return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9, base64: false, allowsEditing: true,
    });
    if (!res.canceled && res.assets[0]) {
      setFile({ uri: res.assets[0].uri, name: 'document.jpg', type: 'image/jpeg' });
      setResult(null);
    }
  };

  const requestGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.'); return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!res.canceled && res.assets[0]) {
      setFile({ uri: res.assets[0].uri, name: 'document.jpg', type: 'image/jpeg' });
      setResult(null);
    }
  };

  const requestPDF = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets[0]) {
      setFile({
        uri: res.assets[0].uri,
        name: res.assets[0].name,
        type: res.assets[0].mimeType || 'application/pdf',
        size: res.assets[0].size,
      });
      setResult(null);
    }
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name || 'document', type: file.type || 'image/jpeg' } as any);
      formData.append('record_type', recordType);
      const { data } = await recordsApi.upload(formData);
      setResult(data);
      setFile(null);
      await qc.invalidateQueries({ queryKey: ['timeline'] });
      await qc.invalidateQueries({ queryKey: ['health-scores'] });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Upload failed. Please try again.';
      Alert.alert('Upload Failed', msg);
    } finally { setUploading(false); }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={['#7C3AED', '#0066FF']} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Upload Document</Text>
        <Text style={styles.headerSub}>Lab reports, prescriptions, scans — AI extracts everything</Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Document Type */}
        <Card>
          <Text style={styles.sectionLabel}>Document Type</Text>
          <View style={styles.typeGrid}>
            {RECORD_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeBtn, recordType === t.key && { backgroundColor: t.color + '18', borderColor: t.color }]}
                onPress={() => setRecordType(t.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={t.icon as any} size={20}
                  color={recordType === t.key ? t.color : Colors.textTertiary}
                />
                <Text style={[
                  styles.typeLabel,
                  { color: recordType === t.key ? t.color : Colors.textSecondary },
                ]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Upload Options */}
        <Card>
          <Text style={styles.sectionLabel}>Select Document</Text>
          <View style={styles.uploadOptions}>
            <TouchableOpacity style={styles.uploadBtn} onPress={requestCamera} activeOpacity={0.75}>
              <View style={[styles.uploadIcon, { backgroundColor: '#EBF3FF' }]}>
                <Ionicons name="camera" size={26} color={Colors.primary} />
              </View>
              <Text style={styles.uploadBtnLabel}>Camera</Text>
              <Text style={styles.uploadBtnSub}>Scan now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadBtn} onPress={requestGallery} activeOpacity={0.75}>
              <View style={[styles.uploadIcon, { backgroundColor: '#F3F0FF' }]}>
                <Ionicons name="images" size={26} color={Colors.purple} />
              </View>
              <Text style={styles.uploadBtnLabel}>Gallery</Text>
              <Text style={styles.uploadBtnSub}>Pick photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadBtn} onPress={requestPDF} activeOpacity={0.75}>
              <View style={[styles.uploadIcon, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="document" size={26} color={Colors.success} />
              </View>
              <Text style={styles.uploadBtnLabel}>PDF / File</Text>
              <Text style={styles.uploadBtnSub}>From storage</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Preview & Upload */}
        {file && (
          <Card style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons name="document-attach" size={16} color={Colors.primary} />
              <Text style={styles.previewTitle}>Ready to upload</Text>
              <TouchableOpacity onPress={() => setFile(null)}>
                <Ionicons name="close-circle" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
            {file.type?.startsWith('image') && (
              <Image source={{ uri: file.uri }} style={styles.previewImage} resizeMode="cover" />
            )}
            <Text style={styles.previewName}>{file.name}</Text>
            {file.size && (
              <Text style={styles.previewSize}>{(file.size / 1024).toFixed(1)} KB</Text>
            )}
            <Button
              title={uploading ? 'Analysing with AI…' : 'Upload & Analyse'}
              onPress={upload} loading={uploading} style={{ marginTop: Spacing.base }}
              icon={<Ionicons name="sparkles" size={16} color="#fff" />}
            />
          </Card>
        )}

        {/* Success Result */}
        {result && (
          <Card style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.resultTitle}>Document Processed!</Text>
                <Text style={styles.resultSub}>AI has extracted your health data</Text>
              </View>
            </View>

            {result.extracted_data && (
              <View style={styles.extractedData}>
                <Text style={styles.extractedTitle}>Extracted Information</Text>
                {result.extracted_data.patient_name && (
                  <Row label="Patient" value={result.extracted_data.patient_name} />
                )}
                {result.extracted_data.report_date && (
                  <Row label="Date" value={new Date(result.extracted_data.report_date).toLocaleDateString('en-IN')} />
                )}
                {result.extracted_data.biomarkers?.slice(0, 5).map((b: any, i: number) => (
                  <Row key={i} label={b.name} value={`${b.value} ${b.unit || ''}`} />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => setResult(null)}
            >
              <Text style={styles.viewBtnText}>Upload Another</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* How it works */}
        {!file && !result && (
          <Card variant="flat">
            <Text style={styles.howTitle}>How AI extraction works</Text>
            {[
              ['🔬', 'Claude Vision reads your document'],
              ['📊', 'Extracts 40+ biomarkers & medicines'],
              ['🧠', 'Correlates with your health history'],
              ['🎯', 'Updates your health scores & alerts'],
            ].map(([icon, text], i) => (
              <View key={i} style={styles.howItem}>
                <Text style={{ fontSize: 18 }}>{icon}</Text>
                <Text style={styles.howText}>{text}</Text>
              </View>
            ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  label: { fontSize: Typography.sm, color: Colors.textSecondary },
  value: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingBottom: 28, paddingHorizontal: Spacing.xl },
  headerTitle: { fontSize: Typography['2xl'], fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.75)', marginTop: 4, lineHeight: 20 },
  body: { padding: Spacing.base, gap: Spacing.base },
  sectionLabel: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.base },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  typeLabel: { fontSize: Typography.xs, fontWeight: '600' },
  uploadOptions: { flexDirection: 'row', justifyContent: 'space-around' },
  uploadBtn: { alignItems: 'center', gap: Spacing.xs, flex: 1 },
  uploadIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', ...Shadow.sm },
  uploadBtnLabel: { fontSize: Typography.sm, fontWeight: '700', color: Colors.text },
  uploadBtnSub: { fontSize: Typography.xs, color: Colors.textTertiary },
  previewCard: { borderWidth: 2, borderColor: Colors.primary },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  previewTitle: { flex: 1, fontSize: Typography.base, fontWeight: '700', color: Colors.primary },
  previewImage: { width: '100%', height: 160, borderRadius: Radius.lg, marginBottom: Spacing.sm },
  previewName: { fontSize: Typography.sm, fontWeight: '600', color: Colors.text },
  previewSize: { fontSize: Typography.xs, color: Colors.textTertiary, marginTop: 2 },
  resultCard: { borderWidth: 1, borderColor: Colors.riskLowBorder, backgroundColor: Colors.successLight },
  resultHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: Spacing.base },
  successIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.success, justifyContent: 'center', alignItems: 'center' },
  resultTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  resultSub: { fontSize: Typography.xs, color: Colors.textSecondary },
  extractedData: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, marginBottom: Spacing.base },
  extractedTitle: { fontSize: Typography.xs, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  viewBtn: { alignItems: 'center', paddingVertical: Spacing.sm },
  viewBtnText: { fontSize: Typography.sm, color: Colors.primary, fontWeight: '600' },
  howTitle: { fontSize: Typography.sm, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.base },
  howItem: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  howText: { fontSize: Typography.base, color: Colors.text, flex: 1 },
});
