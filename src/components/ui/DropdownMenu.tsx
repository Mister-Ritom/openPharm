import React, { useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Platform,
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/designSystem';

export interface MenuItem {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  destructive?: boolean;
}

interface DropdownMenuProps {
  visible: boolean;
  onClose: () => void;
  items: MenuItem[];
  anchorPosition?: { top: number; right: number };
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  visible, 
  onClose, 
  items,
  anchorPosition = { top: 60, right: 16 }
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.95);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.95, { duration: 150 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible && opacity.value === 0) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.menuContainer, 
                { top: anchorPosition.top, right: anchorPosition.right },
                animatedStyle
              ]}
            >
              <View style={styles.content}>
                {items.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.item,
                      index < items.length - 1 && styles.border
                    ]}
                    onPress={() => {
                      onClose();
                      // Small delay to let the menu close before navigation starts
                      setTimeout(item.onPress, 100);
                    }}
                    activeOpacity={0.6}
                  >
                    {item.icon && (
                      <Ionicons 
                        name={item.icon} 
                        size={20} 
                        color={item.destructive ? theme.colors.error : theme.colors.onSurfaceVariant} 
                        style={styles.icon}
                      />
                    )}
                    <Text style={[
                      styles.label,
                      item.destructive && { color: theme.colors.error }
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menuContainer: {
    position: 'absolute',
    width: 220,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.rounding.default,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
    zIndex: 1000,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(188, 202, 190, 0.2)', // outlineVariant at low opacity
  },
  content: {
    padding: theme.spacing[2],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderRadius: theme.rounding.default / 2,
  },
  border: {
    // borderBottomWidth: 1,
    // borderBottomColor: 'rgba(188, 202, 190, 0.1)',
  },
  icon: {
    marginRight: theme.spacing[3],
  },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
});
