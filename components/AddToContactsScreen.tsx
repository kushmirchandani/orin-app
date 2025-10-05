import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Contacts from 'expo-contacts'
import { Ionicons } from '@expo/vector-icons'

interface AddToContactsScreenProps {
  onComplete: () => void
  phoneNumber: string // Twilio phone number to add
}

const AddToContactsScreen = ({ onComplete, phoneNumber }: AddToContactsScreenProps) => {
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToContacts = async () => {
    try {
      setIsAdding(true)

      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync()

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable contacts access in Settings to add Orin to your contacts.',
          [
            { text: 'Skip', onPress: onComplete },
            { text: 'OK' },
          ]
        )
        return
      }

      // Create contact
      const contact: Contacts.Contact = {
        name: 'Orin',
        firstName: 'Orin',
        contactType: Contacts.ContactTypes.Person,
        phoneNumbers: [
          {
            label: 'mobile',
            number: phoneNumber,
          },
        ],
        note: 'Your AI thought companion 💙',
      }

      // Add to contacts
      const contactId = await Contacts.addContactAsync(contact)

      if (contactId) {
        Alert.alert(
          'Success! 🎉',
          'Orin has been added to your contacts. You can now text your thoughts anytime!',
          [{ text: 'Continue', onPress: onComplete }]
        )
      }

    } catch (error) {
      console.error('Error adding contact:', error)
      Alert.alert(
        'Error',
        'Could not add contact. You can always save this number manually.',
        [{ text: 'OK', onPress: onComplete }]
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Skip button */}
        <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Contact Card */}
        <View style={styles.card}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('../assets/images/orin-logo.png')}
              style={styles.avatar}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.name}>Orin</Text>
          <Text style={styles.subtitle}>Your AI Thought Companion</Text>

          <View style={styles.phoneContainer}>
            <Ionicons name="call-outline" size={20} color="#667eea" />
            <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          </View>

          <Text style={styles.description}>
            Add Orin to your contacts so you can text your thoughts anytime, anywhere.
          </Text>

          <TouchableOpacity
            style={[styles.addButton, isAdding && styles.addButtonDisabled]}
            onPress={handleAddToContacts}
            disabled={isAdding}
          >
            <Ionicons name="person-add" size={24} color="white" />
            <Text style={styles.addButtonText}>
              {isAdding ? 'Adding...' : 'Add to Contacts'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.laterButton} onPress={onComplete}>
            <Text style={styles.laterButtonText}>I'll do this later</Text>
          </TouchableOpacity>
        </View>

        {/* Info bubbles */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Ionicons name="chatbubble-outline" size={24} color="#667eea" />
            <Text style={styles.featureText}>Text thoughts anytime</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="notifications-outline" size={24} color="#667eea" />
            <Text style={styles.featureText}>Get gentle reminders</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#667eea" />
            <Text style={styles.featureText}>Auto-organize tasks</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginTop: 20,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#667eea',
  },
  avatar: {
    width: 80,
    height: 80,
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9f9f9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#667eea',
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  laterButton: {
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
  features: {
    marginTop: 32,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
})

export default AddToContactsScreen
