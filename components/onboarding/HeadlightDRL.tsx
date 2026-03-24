import React, { useCallback, useRef } from 'react';
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
  const loadCount = useRef(0);
  const hasAnimated = useRef(false);
  const isFocused = useRef(false);

  const runAnimation = useCallback(() => {
    reveal.value = 0;
    reveal.value = withDelay(
      2500, // Delay to let iOS "Save Password?" prompt appear and dismiss
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) })
    );
  }, []);

  // Track focus state
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;

      // If images already loaded from a previous visit, animate immediately
      if (loadCount.current >= 2) {
        hasAnimated.current = false;
        runAnimation();
      }

      return () => {
        isFocused.current = false;
        hasAnimated.current = false;
      };
    }, [runAnimation])
  );

  // Called when each image finishes loading
  const handleImageLoad = useCallback(() => {
    loadCount.current += 1;
    // Once both images are loaded AND we're focused AND haven't animated yet
    if (loadCount.current >= 2 && isFocused.current && !hasAnimated.current) {
      hasAnimated.current = true;
      runAnimation();
    }
  }, [runAnimation]);

  const clipStyle = useAnimatedStyle(() => ({
    height: reveal.value * stripHeight,
    overflow: 'hidden' as const,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
  }));

  return (
    <View style={{ flexDirection: 'row', alignSelf: 'center', justifyContent: 'center', gap, flex: 1, alignItems: 'center' }}>
      {/* Left DRL */}
      <View style={{ width: stripWidth, height: stripHeight }}>
        {/* Hidden full-size image to trigger onLoad */}
        <Image
          source={LEFT_DRL}
          onLoad={handleImageLoad}
          style={{ width: 0, height: 0, position: 'absolute' }}
        />
        <Animated.View style={clipStyle}>
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
        {/* Hidden full-size image to trigger onLoad */}
        <Image
          source={RIGHT_DRL}
          onLoad={handleImageLoad}
          style={{ width: 0, height: 0, position: 'absolute' }}
        />
        <Animated.View style={clipStyle}>
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
