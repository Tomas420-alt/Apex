import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/constants/theme';

const LEFT_DRL = require('@/assets/images/drl-left.png');
const RIGHT_DRL = require('@/assets/images/drl-right.png');

SplashScreen.preventAutoHideAsync();

interface Props {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const stripWidth = (screenWidth - 40) * 0.38;
  const stripHeight = stripWidth * 1.1;
  const gap = stripWidth * 0.5;

  const reveal = useSharedValue(0);
  const fadeOut = useSharedValue(1);

  useEffect(() => {
    // Hide native splash immediately — our animated one takes over
    SplashScreen.hideAsync();

    // DRL strips light up bottom to top
    reveal.value = withDelay(
      400,
      withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) })
    );

    // After animation, fade out the splash and call onFinish
    fadeOut.value = withDelay(
      2800,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }, () => {
        runOnJS(onFinish)();
      })
    );
  }, []);

  const leftClipStyle = useAnimatedStyle(() => ({
    height: reveal.value * stripHeight,
    overflow: 'hidden' as const,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
  }));

  const rightClipStyle = useAnimatedStyle(() => ({
    height: reveal.value * stripHeight,
    overflow: 'hidden' as const,
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: fadeOut.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.bg,
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        },
        containerStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap, alignItems: 'center' }}>
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
    </Animated.View>
  );
}
