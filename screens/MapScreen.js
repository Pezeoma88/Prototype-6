import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Ionicons from '@react-native-vector-icons/ionicons';
import AppButton from '../components/AppButton';
import Avatar from '../components/Avatar';
import Badge from '../components/Badge';
import Notice from '../components/Notice';
import ScreenHeader from '../components/ScreenHeader';
import { SMU_MAP_REGION, pickupKey } from '../lib/pickupLocations';
import { colors, gutter, radius, shadow, spacing, typography } from '../theme/theme';

// Map tab: the rides on the board, shown as pins at their pickup spots
// around the SMU campus. Rides leaving from the same spot share one pin;
// tapping it lists them, each with a button to open its Ride Details.
//
// The map only shows where RIDES leave from. It never asks for, or shows,
// the user's own location. A ride with no pickup spot isn't on the map (it
// is still on the Home board), and the note at the top says how many.
export default function MapScreen({
  drivers,
  isBoardLoading,
  isRefreshing,
  boardError,
  handleRefresh,
  onOpenRide,
  onGoHome,
}) {
  // The key of the pickup spot whose rides are showing, or null.
  const [selectedSpotKey, setSelectedSpotKey] = useState(null);

  // Group the rides that have a pickup into one entry per spot.
  const spots = [];
  for (const ride of drivers) {
    if (!ride.pickup) continue;
    const key = pickupKey(ride.pickup);
    let spot = spots.find((s) => s.key === key);
    if (!spot) {
      spot = { key, label: ride.pickup.label, coordinate: ride.pickup, rides: [] };
      spots.push(spot);
    }
    spot.rides.push(ride);
  }
  const offMapCount = drivers.filter((ride) => !ride.pickup).length;
  // null again if the selected spot's last ride was cancelled.
  const selectedSpot = spots.find((spot) => spot.key === selectedSpotKey) || null;
  const isFirstLoad = isBoardLoading && drivers.length === 0;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Map"
        subtitle="Tap a pin to see rides leaving from there"
        right={
          <AppButton
            title="Refresh"
            icon="refresh"
            variant="secondary"
            size="sm"
            loading={isRefreshing}
            onPress={handleRefresh}
          />
        }
      />

      {boardError !== '' && (
        <View style={styles.padded}>
          <Notice message={boardError} tone="danger" />
        </View>
      )}

      <View style={styles.mapWrap}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={SMU_MAP_REGION}
          userInterfaceStyle="dark"
          showsUserLocation={false}
          toolbarEnabled={false}
          onPress={(event) => {
            // Tapping the map itself (not a pin) closes the preview.
            if (event.nativeEvent.action !== 'marker-press') {
              setSelectedSpotKey(null);
            }
          }}
        >
          {spots.map((spot) => {
            const isSelected = spot.key === selectedSpotKey;
            const allFull = spot.rides.every((ride) => ride.seats === 0);
            const pinColor = isSelected ? colors.rider : allFull ? colors.textFaint : colors.primary;
            return (
              <Marker
                // The color is part of the key so a pin is redrawn when it
                // changes (native pins don't always pick up a new color).
                key={`${spot.key}-${pinColor}`}
                coordinate={spot.coordinate}
                pinColor={pinColor}
                onPress={() => setSelectedSpotKey(spot.key)}
                accessibilityLabel={`${spot.label}: ${spot.rides.length} ride${
                  spot.rides.length === 1 ? '' : 's'
                }`}
              />
            );
          })}
        </MapView>

        {/* Status notes over the top of the map */}
        <View style={styles.topOverlay} pointerEvents="box-none">
          {isFirstLoad ? (
            <View style={styles.pill}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.pillText}>Loading rides…</Text>
            </View>
          ) : spots.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="map-outline" size={22} color={colors.primary} />
              <Text style={styles.emptyTitle}>No rides on the map yet</Text>
              <Text style={styles.emptyText}>
                {offMapCount > 0
                  ? `${offMapCount} ride${offMapCount === 1 ? ' has' : 's have'} no pickup spot. Drivers can add one by editing their ride.`
                  : 'Rides appear here once a driver posts one with a pickup spot.'}
              </Text>
              <AppButton
                title="Browse Rides on Home"
                variant="secondary"
                size="sm"
                onPress={onGoHome}
                style={styles.emptyButton}
              />
            </View>
          ) : offMapCount > 0 ? (
            <View style={styles.pill}>
              <Ionicons name="information-circle" size={16} color={colors.textMuted} />
              <Text style={styles.pillText}>
                {offMapCount} more ride{offMapCount === 1 ? '' : 's'} without a pickup spot on Home
              </Text>
            </View>
          ) : null}
        </View>

        {/* Ride preview for the tapped pin */}
        {selectedSpot && (
          <View style={styles.preview}>
            <View style={styles.previewHeader}>
              <Ionicons name="location" size={18} color={colors.rider} />
              <View style={styles.previewTitleCol}>
                <Text style={styles.previewTitle} numberOfLines={1}>
                  {selectedSpot.label}
                </Text>
                <Text style={styles.previewSub}>
                  {selectedSpot.rides.length} ride{selectedSpot.rides.length === 1 ? '' : 's'} leaving
                  from here
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedSpotKey(null)}
                accessibilityRole="button"
                accessibilityLabel="Close ride preview"
                hitSlop={10}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.previewList}>
              {selectedSpot.rides.map((ride) => (
                <View key={ride.id} style={styles.previewRide}>
                  <View style={styles.previewRideTop}>
                    <Avatar name={ride.name} role="driver" uri={ride.avatarUrl} size={36} />
                    <View style={styles.previewRideText}>
                      <Text style={styles.previewDestination} numberOfLines={1}>
                        To {ride.destination}
                      </Text>
                      <Text style={styles.previewMeta} numberOfLines={1}>
                        {ride.departureTime}
                      </Text>
                      <Text style={styles.previewMeta} numberOfLines={1}>
                        Driver: {ride.name}
                      </Text>
                    </View>
                    <Badge
                      label={
                        ride.seats === 0
                          ? 'Full'
                          : `${ride.seats} seat${ride.seats === 1 ? '' : 's'} left`
                      }
                      tone={ride.seats === 0 ? 'danger' : 'driver'}
                    />
                  </View>
                  <AppButton
                    title="Open Ride Details"
                    icon="arrow-forward"
                    size="sm"
                    onPress={() => onOpenRide(ride.id)}
                    style={styles.previewButton}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: gutter,
  },
  mapWrap: {
    flex: 1,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  topOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: gutter,
    right: gutter,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    ...shadow.card,
  },
  pillText: {
    ...typography.caption,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    ...shadow.card,
  },
  emptyTitle: {
    ...typography.title,
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.label,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  emptyButton: {
    marginTop: spacing.md,
  },
  preview: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    ...shadow.card,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewTitleCol: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  previewTitle: {
    ...typography.title,
    color: colors.text,
  },
  previewSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  previewList: {
    maxHeight: 250,
  },
  previewRide: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  previewRideTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewRideText: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  previewDestination: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  previewMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  previewButton: {
    marginTop: spacing.md,
  },
});
