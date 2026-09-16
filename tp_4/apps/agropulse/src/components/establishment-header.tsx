import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useOrganization } from '@/providers/organization-provider';

type EstablishmentHeaderProps = {
  showAvatar?: boolean;
};

export function EstablishmentHeader({ showAvatar = true }: EstablishmentHeaderProps) {
  const router = useRouter();
  const {
    organizations,
    selectedOrgId,
    selectedOrganization,
    selectOrganization,
  } = useOrganization();
  const [showModal, setShowModal] = useState(false);

  function handlePress() {
    setShowModal(true);
  }

  async function handleSelect(orgId: string) {
    setShowModal(false);
    if (orgId !== selectedOrgId) {
      await selectOrganization(orgId);
    }
  }

  return (
    <>
      <View style={styles.topHeader}>
        <Pressable
          style={styles.establishmentCol}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`Establecimiento: ${selectedOrganization?.name ?? 'Sin establecimiento'}. Toca para cambiar de establecimiento.`}
        >
          <Text style={styles.establishmentEyebrow}>ESTABLECIMIENTO</Text>
          <View style={styles.establishmentTitleRow}>
            <Text style={styles.establishmentTitle} numberOfLines={1}>
              {selectedOrganization?.name ?? 'Sin establecimiento'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#86948a" />
          </View>
        </Pressable>

        {showAvatar && (
          <Pressable
            style={styles.topAvatar}
            onPress={() => router.push('/(app)/(tabs)/account')}
            accessibilityRole="button"
            accessibilityLabel="Ir a perfil y cuenta"
          >
            <Ionicons name="person" color="#003824" size={18} />
          </Pressable>
        )}
      </View>

      {/* Organization Switcher Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Cambiar Establecimiento</Text>
              <Pressable
                onPress={() => setShowModal(false)}
                hitSlop={8}
                accessibilityLabel="Cerrar modal"
              >
                <Ionicons name="close" size={20} color="#86948a" />
              </Pressable>
            </View>

            {organizations.map((org) => {
              const isSelected = org.id === selectedOrgId;
              return (
                <Pressable
                  key={org.id}
                  style={[
                    styles.modalOrgItem,
                    isSelected && styles.modalOrgItemSelected,
                  ]}
                  onPress={() => void handleSelect(org.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.modalOrgText,
                      isSelected && styles.modalOrgTextSelected,
                    ]}
                  >
                    {org.name}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#22c55e"
                    />
                  )}
                </Pressable>
              );
            })}

            {organizations.length <= 1 && (
              <Text style={styles.modalSingleHint}>
                Tu usuario actualmente pertenece a este único establecimiento.
              </Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  establishmentCol: {
    flex: 1,
    gap: 3,
  },
  establishmentEyebrow: {
    color: '#86948a',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  establishmentTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  establishmentTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topAvatar: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#171d1a',
    borderColor: '#252f29',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    maxWidth: 420,
    padding: 20,
    width: '100%',
  },
  modalHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSingleHint: {
    color: '#86948a',
    fontSize: 13,
    marginTop: 4,
  },
  modalOrgItem: {
    alignItems: 'center',
    backgroundColor: '#101613',
    borderColor: '#222b25',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  modalOrgItemSelected: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: '#22c55e',
  },
  modalOrgText: {
    color: '#dee4df',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOrgTextSelected: {
    color: '#22c55e',
    fontWeight: '800',
  },
});
