import React, { useCallback } from 'react';
import { View, Image, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const LEFT_DRL = require('@/assets/images/drl-left.png');
const RIGHT_DRL = require('@/assets/images/drl-right.png');

export function HeadlightDRL() {
  const { width: screenWidth } = useWindowDimensions();
  const stripWidth = (screenWidth - 40) * 0.38;
  const stripHeight = stripWidth * 1.1;
  const gap = stripWidth * 0.5;

  const reveal = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      // Reset and replay every time screen opens
      reveal.value = 0;
      reveal.value = withDelay(
        800,
        withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) })
      );
    }, [])
  );

  // Clip from bottom up — reveals strip as light sweeps upward
  const leftClipStyle = useAnimatedStyle(() => {
    const visibleHeight = reveal.value * stripHeight;
    return {
      height: visibleHeight,
      overflow: 'hidden',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    };
  });

  const rightClipStyle = useAnimatedStyle(() => {
    const visibleHeight = reveal.value * stripHeight;
    return {
      height: visibleHeight,
      overflow: 'hidden',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    };
  });

  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', justifyContent: 'center', gap, flex: 1, alignItems: 'center' }}>
      {/* Left DRL */}
      <View style={{ width: stripWidth, height: stripHeight }}>
        <Animated.View style={leftClipStyle}>
          <Image
            source={LEFT_DRL}
            style={{
              width: stripWidth,
              height: stripHeight,
              resizeMode: 'contain',
              tintColor: '#FFFFFF',
              position: 'absolute',
              bottom: 0,
            }}
          />
        </Animated.View>
      </View>

      {/* Right DRL */}
      <View style={{ width: stripWidth, height: stripHeight }}>
        <Animated.View style={rightClipStyle}>
          <Image
            source={RIGHT_DRL}
            style={{
              width: stripWidth,
              height: stripHeight,
              resizeMode: 'contain',
              tintColor: '#FFFFFF',
              position: 'absolute',
              bottom: 0,
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
}
