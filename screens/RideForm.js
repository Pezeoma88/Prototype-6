import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@react-native-vector-icons/ionicons';
import AppButton from '../components/AppButton';
import BackHeader from '../components/BackHeader';
import FormSection from '../components/FormSection';
import Notice from '../components/Notice';
import TextField from '../components/TextField';
import {
  DEPARTURE_MINUTE_INTERVAL,
  MAX_SEATS,
  MIN_SEATS,
  formatDeparture,
} from '../lib/format';
import { PICKUP_LOCATIONS, isSamePickup } from '../lib/pickupLocations';
import { colors, radius, spacing, typography } from '../theme/theme';

// Offer a Ride / Edit Ride form for Drivers, grouped into Route, When, and
// Seats sections. State, validation, and saving stay in App.js; this
// component only renders them.
export default function RideForm({
  currentUser,
  editingRideId,
  editingDriver,
  destinationInput,
  setDestinationInput,
  pickupInput,
  setPickupInput,
  departureAtInput,
  departurePickerMode,
  setDeparturePickerMode,
  departurePickerMinimumDate,
  handleToggleDeparturePicker,
  handleDeparturePicked,
  seatsInput,
  setSeatsInput,
  formError,
  isSubmittingDriver,
  handleSaveDriver,
  resetForm,
}) {
  const isEditing = editingRideId !== null;

  // The choices for the pickup spot. A ride being edited whose saved pickup
  // isn't one of the presets keeps it as an extra choice, so opening the
  // form never silently changes where the ride leaves from.
  const pickupOptions =
    pickupInput !== null && !PICKUP_LOCATIONS.some((spot) => isSamePickup(spot, pickupInput))
      ? [{ key: 'current', ...pickupInput }, ...PICKUP_LOCATIONS]
      : PICKUP_LOCATIONS;

  function handlePickPickup(spot) {
    Keyboard.dismiss();
    setDeparturePickerMode(null);
    setPickupInput(
      spot === null
        ? null
        : { latitude: spot.latitude, longitude: spot.longitude, label: spot.label }
    );
  }

  return (
    <View>
      <BackHeader
        backLabel="Cancel"
        onBack={resetForm}
        title={isEditing ? 'Edit Ride' : 'Offer a Ride'}
        subtitle={`${isEditing ? 'Editing' : 'Posting'} as ${currentUser.name}`}
      />

      <FormSection title="Route" icon="navigate">
        <TextField
          label="Where are you going?"
          icon="flag-outline"
          placeholder="Destination (e.g. Campus Library)"
          value={destinationInput}
          onChangeText={setDestinationInput}
          onFocus={() => setDeparturePickerMode(null)}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          style={styles.lastField}
        />
      </FormSection>

      {/* Pickup is chosen from preset public landmarks rather than typed or
          pinned, so it always has a readable name and is never a private
          address. It's optional. */}
      <FormSection title="Pickup spot (optional)" icon="location">
        <View style={styles.pickupDisplay}>
          <Ionicons
            name={pickupInput !== null ? 'location' : 'location-outline'}
            size={18}
            color={pickupInput !== null ? colors.primary : colors.textFaint}
          />
          <Text
            style={pickupInput !== null ? styles.departureText : styles.departurePlaceholder}
            numberOfLines={1}
          >
            {pickupInput !== null ? pickupInput.label : 'No pickup spot'}
          </Text>
        </View>
        <View style={styles.pickupChips}>
          {[null, ...pickupOptions].map((spot) => {
            const isActive = spot === null ? pickupInput === null : isSamePickup(spot, pickupInput);
            return (
              <Pressable
                key={spot === null ? 'none' : spot.key}
                onPress={() => handlePickPickup(spot)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={spot === null ? 'No pickup spot' : spot.label}
                style={({ pressed }) => [
                  styles.pickupChip,
                  isActive && styles.pickupChipActive,
                  pressed && styles.pickerButtonPressed,
                ]}
              >
                <Text
                  style={[styles.pickupChipText, isActive && styles.pickupChipTextActive]}
                  numberOfLines={1}
                >
                  {spot === null ? 'None' : spot.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.pickupHint}>
          Test locations: public SMU landmarks. A ride with a pickup spot appears on the Map tab;
          without one it&apos;s still listed on Home.
        </Text>
      </FormSection>

      {/* Departure is picked on native scrolling wheels instead of typed:
          one wheel for the day and one for the time, combined into a single
          Date. On iPhone the wheels appear inline (spinner style); on
          Android the system date/time dialogs are used. */}
      <FormSection title="When are you leaving?" icon="calendar">
        <View style={styles.departureDisplay}>
          <Ionicons
            name="time-outline"
            size={18}
            color={departureAtInput !== null ? colors.primary : colors.textFaint}
          />
          <Text
            style={departureAtInput !== null ? styles.departureText : styles.departurePlaceholder}
            numberOfLines={1}
          >
            {departureAtInput !== null
              ? formatDeparture(departureAtInput)
              : 'Choose a departure date and time'}
          </Text>
        </View>

        <View style={styles.pickerButtons}>
          {[
            { mode: 'date', label: 'Date', icon: 'calendar-outline' },
            { mode: 'time', label: 'Time', icon: 'time-outline' },
          ].map((option) => {
            const isActive = departurePickerMode === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => handleToggleDeparturePicker(option.mode)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.pickerButton,
                  isActive && styles.pickerButtonActive,
                  pressed && styles.pickerButtonPressed,
                ]}
              >
                <Ionicons
                  name={isActive ? 'checkmark' : option.icon}
                  size={16}
                  color={isActive ? colors.textOnAccent : colors.primary}
                />
                <Text style={[styles.pickerButtonText, isActive && styles.pickerButtonTextActive]}>
                  {isActive ? 'Done' : `Pick ${option.label}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {departurePickerMode !== null && departureAtInput !== null && (
          <View style={Platform.OS === 'ios' ? styles.pickerBox : null}>
            <DateTimePicker
              key={departurePickerMode}
              value={departureAtInput}
              mode={departurePickerMode}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={departurePickerMinimumDate}
              minuteInterval={DEPARTURE_MINUTE_INTERVAL}
              themeVariant="dark"
              textColor={colors.text}
              locale="en-US"
              onValueChange={(event, date) => handleDeparturePicked(date)}
              onDismiss={() => setDeparturePickerMode(null)}
            />
          </View>
        )}
      </FormSection>

      {/* iOS has no Return key on a number pad, but pairing
          returnKeyType="done" with a number-pad keyboardType makes iOS show
          its own native "Done" toolbar above the keyboard, which fires
          onSubmitEditing below. That's what actually dismisses the keyboard
          on a real device, so no custom accessory bar is rendered here.
          Digits are filtered as typed so only whole numbers land. */}
      <FormSection title="Seats" icon="people">
        <TextField
          label="How many seats can you offer?"
          icon="person-add-outline"
          placeholder={`Open seats (${MIN_SEATS}–${MAX_SEATS})`}
          value={seatsInput}
          onChangeText={(text) => setSeatsInput(text.replace(/[^0-9]/g, ''))}
          onFocus={() => setDeparturePickerMode(null)}
          keyboardType="number-pad"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
          hint={
            editingDriver !== null && editingDriver.matchedRiders.length > 0
              ? `${editingDriver.matchedRiders.length} confirmed rider${
                  editingDriver.matchedRiders.length === 1 ? '' : 's'
                } — total seats can't go below that.`
              : `Between ${MIN_SEATS} and ${MAX_SEATS}, not counting yourself.`
          }
          style={styles.lastField}
        />
      </FormSection>

      {formError !== '' && <Notice message={formError} tone="danger" style={styles.error} />}

      <AppButton
        title={isEditing ? 'Save Changes' : 'Post Ride'}
        icon={isEditing ? 'checkmark-circle-outline' : 'car-sport'}
        onPress={handleSaveDriver}
        loading={isSubmittingDriver}
        style={styles.submit}
      />
      <AppButton title="Cancel" variant="secondary" onPress={resetForm} />
    </View>
  );
}

const styles = StyleSheet.create({
  lastField: {
    marginBottom: 0,
  },
  pickupDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 10,
  },
  pickupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pickupChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    maxWidth: '100%',
  },
  pickupChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickupChipText: {
    ...typography.label,
    color: colors.text,
  },
  pickupChipTextActive: {
    color: colors.textOnAccent,
  },
  pickupHint: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: spacing.md,
  },
  departureDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 10,
  },
  departureText: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  departurePlaceholder: {
    fontSize: 16,
    color: colors.textFaint,
    flex: 1,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 10,
  },
  pickerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerButtonPressed: {
    opacity: 0.7,
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  pickerButtonTextActive: {
    color: colors.textOnAccent,
  },
  pickerBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  error: {
    marginTop: spacing.xs,
  },
  submit: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
});
