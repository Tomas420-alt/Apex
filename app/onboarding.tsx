import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated as RNAnimated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send } from 'lucide-react-native';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  type: 'bot' | 'user';
  text: string;
}

interface Choice {
  label: string;
  value: string;
}

interface InterviewStep {
  id: string;
  section: number;
  botMessages: string[] | ((answers: Record<string, string>) => string[]);
  inputType: 'choice' | 'text' | 'number' | 'date' | 'confirm';
  choices?: Choice[] | ((answers: Record<string, string>) => Choice[]);
  placeholder?: string | ((answers: Record<string, string>) => string);
  validation?: (val: string) => string | null;
  skipIf?: (answers: Record<string, string>) => boolean;
  acknowledgement?: string | ((answer: string, answers: Record<string, string>) => string);
  hasUnitToggle?: boolean; // show km/miles toggle for this step
  hasPeriodToggle?: boolean; // show week/month/year toggle
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type UnitSystem = 'km' | 'miles';
type MileagePeriod = 'week' | 'month' | 'year';

const KM_TO_MILES = 0.621371;

function unitLabel(unit: UnitSystem) {
  return unit === 'km' ? 'km' : 'mi';
}

function convertForDisplay(km: number, unit: UnitSystem): number {
  return unit === 'miles' ? Math.round(km * KM_TO_MILES) : km;
}

// Mileage choices per period (values are always stored as annual km)
function getMileageChoices(period: MileagePeriod, unit: UnitSystem): Choice[] {
  const u = unitLabel(unit);

  if (period === 'week') {
    const ranges = [
      { km: [0, 50], annual: 2000 },
      { km: [50, 100], annual: 4000 },
      { km: [100, 200], annual: 8000 },
      { km: [200, 400], annual: 16000 },
      { km: [400, Infinity], annual: 25000 },
    ];
    return ranges.map((r) => {
      const lo = convertForDisplay(r.km[0], unit);
      const hi = convertForDisplay(r.km[1], unit);
      const label = r.km[1] === Infinity
        ? `Over ${lo.toLocaleString()} ${u}/week`
        : `${lo.toLocaleString()} - ${hi.toLocaleString()} ${u}/week`;
      return { label: lo === 0 ? `Under ${hi.toLocaleString()} ${u}/week` : label, value: String(r.annual) };
    });
  }

  if (period === 'month') {
    const ranges = [
      { km: [0, 250], annual: 2000 },
      { km: [250, 700], annual: 5500 },
      { km: [700, 1300], annual: 12000 },
      { km: [1300, 2100], annual: 20000 },
      { km: [2100, Infinity], annual: 30000 },
    ];
    return ranges.map((r) => {
      const lo = convertForDisplay(r.km[0], unit);
      const hi = convertForDisplay(r.km[1], unit);
      const label = r.km[1] === Infinity
        ? `Over ${lo.toLocaleString()} ${u}/month`
        : `${lo.toLocaleString()} - ${hi.toLocaleString()} ${u}/month`;
      return { label: lo === 0 ? `Under ${hi.toLocaleString()} ${u}/month` : label, value: String(r.annual) };
    });
  }

  // year
  const ranges = [
    { km: [0, 3000], annual: 2000 },
    { km: [3000, 8000], annual: 5000 },
    { km: [8000, 15000], annual: 12000 },
    { km: [15000, 25000], annual: 20000 },
    { km: [25000, Infinity], annual: 30000 },
  ];
  return ranges.map((r) => {
    const lo = convertForDisplay(r.km[0], unit);
    const hi = convertForDisplay(r.km[1], unit);
    const label = r.km[1] === Infinity
      ? `Over ${lo.toLocaleString()} ${u}/year`
      : `${lo.toLocaleString()} - ${hi.toLocaleString()} ${u}/year`;
    return { label: lo === 0 ? `Under ${hi.toLocaleString()} ${u}/year` : label, value: String(r.annual) };
  });
}

// Fan service responses for maintenance comfort based on experience
function getMaintenanceAck(comfort: string, answers: Record<string, string>): string {
  const exp = answers.experienceLevel || 'beginner';

  if (comfort === 'none') {
    if (exp === 'beginner') return "No worries at all! That's exactly what we're here for. We'll guide you through everything step by step — you'll be turning wrenches before you know it!";
    if (exp === 'intermediate') return "Fair enough! Some riders prefer to leave it to the pros. We'll make sure you always know what to expect at each service.";
    return "Hey, sometimes it's nice to let someone else get their hands dirty! With your experience, you'll always know if the shop's doing right by your bike.";
  }
  if (comfort === 'beginner') {
    if (exp === 'beginner') return "That's the spirit! Everyone starts somewhere, and the fact that you're keen to learn already puts you ahead. We'll walk you through everything — you've got this!";
    if (exp === 'intermediate') return "Love that you're getting into it! With a couple of years in the saddle, you'll pick up maintenance skills faster than you think.";
    if (exp === 'advanced') return "Nice — never too late to start getting your hands dirty! With your riding experience, the mechanical side will come naturally.";
    return "With all your years of riding, you probably understand bikes better than you give yourself credit for. The hands-on part will click in no time!";
  }
  if (comfort === 'basic') {
    if (exp === 'beginner') return "That's awesome for someone just starting out! Oil changes and chain care are the foundation — you're already ahead of most beginners!";
    if (exp === 'intermediate') return "Nice! You've got the essentials locked down. We'll help you level up when you're ready for more.";
    return "Solid foundation! Sometimes keeping it simple and reliable is the smartest move.";
  }
  if (comfort === 'intermediate') {
    if (exp === 'beginner') return "Brakes and filters already?! You're a natural — most beginners wouldn't dare. Seriously impressive!";
    if (exp === 'intermediate') return "Brakes, filters, and more — you're not messing around! That's some serious hands-on skill right there.";
    return "You clearly know your way around a toolbox. Your bike's in great hands!";
  }
  // advanced
  if (exp === 'expert') return "10+ years AND you do everything yourself? That's legendary status right there. Your bike couldn't be in better hands — absolute garage warrior!";
  if (exp === 'advanced') return "A full-on garage warrior! Doing it all yourself takes real dedication and skill. Your bike is lucky to have you!";
  return "You do everything yourself?! That's incredible dedication. Most riders with your experience wouldn't even attempt half of that. Respect!";
}

// ─── Interview Steps ─────────────────────────────────────────────────────────

const TOTAL_SECTIONS = 12;

const INTERVIEW_STEPS: InterviewStep[] = [
  // Section 0: Welcome
  {
    id: 'welcome',
    section: 0,
    botMessages: [
      "Hey there! Welcome to Apex! 🏍️",
      "I'm going to ask you a few quick questions about your bike and riding habits so we can set up a personalized maintenance plan.",
      "Let's get started — what's your name?",
    ],
    inputType: 'text',
    placeholder: 'Your name',
    acknowledgement: (name) => `Nice to meet you, ${name}!`,
  },

  // Section 1: Location
  {
    id: 'country',
    section: 1,
    botMessages: ["What country are you in?"],
    inputType: 'choice',
    choices: [
      { label: 'United States', value: 'United States' },
      { label: 'United Kingdom', value: 'United Kingdom' },
      { label: 'Ireland', value: 'Ireland' },
      { label: 'Canada', value: 'Canada' },
      { label: 'Australia', value: 'Australia' },
      { label: 'New Zealand', value: 'New Zealand' },
      { label: 'Germany', value: 'Germany' },
      { label: 'France', value: 'France' },
      { label: 'Italy', value: 'Italy' },
      { label: 'Spain', value: 'Spain' },
      { label: 'Netherlands', value: 'Netherlands' },
      { label: 'Japan', value: 'Japan' },
      { label: 'India', value: 'India' },
      { label: 'Brazil', value: 'Brazil' },
      { label: 'South Africa', value: 'South Africa' },
    ],
    placeholder: 'Or type your country...',
    acknowledgement: "Now let's talk about your ride.",
  },

  // Section 2: Bike Details
  {
    id: 'make',
    section: 2,
    botMessages: ["What's the make of your motorcycle?"],
    inputType: 'choice',
    choices: [
      { label: 'Honda', value: 'Honda' },
      { label: 'Yamaha', value: 'Yamaha' },
      { label: 'Kawasaki', value: 'Kawasaki' },
      { label: 'Suzuki', value: 'Suzuki' },
      { label: 'Ducati', value: 'Ducati' },
      { label: 'BMW', value: 'BMW' },
      { label: 'KTM', value: 'KTM' },
      { label: 'Harley-Davidson', value: 'Harley-Davidson' },
      { label: 'Triumph', value: 'Triumph' },
      { label: 'Royal Enfield', value: 'Royal Enfield' },
    ],
    placeholder: 'Or type another make...',
    acknowledgement: (make) => `${make} — great choice!`,
  },
  {
    id: 'model',
    section: 2,
    botMessages: ["What model is it?"],
    inputType: 'text',
    placeholder: 'e.g. CBR600RR, MT-07, Ninja 400',
    acknowledgement: "Got it!",
  },
  {
    id: 'year',
    section: 2,
    botMessages: ["What year was it manufactured?"],
    inputType: 'number',
    placeholder: 'e.g. 2023',
    validation: (val) => {
      const n = Number(val);
      if (isNaN(n) || n < 1900 || n > 2027) return 'Please enter a valid year (1900-2027)';
      return null;
    },
  },
  {
    id: 'units',
    section: 2,
    botMessages: ["Do you prefer kilometers or miles?"],
    inputType: 'choice',
    choices: [
      { label: 'Kilometers (km)', value: 'km' },
      { label: 'Miles (mi)', value: 'miles' },
    ],
  },
  {
    id: 'mileage',
    section: 2,
    botMessages: (answers) => {
      const u = answers.units === 'miles' ? 'miles' : 'kilometers';
      return [`How many ${u} are on the odometer right now?`];
    },
    inputType: 'number',
    placeholder: (answers) => answers.units === 'miles' ? 'e.g. 7800' : 'e.g. 12500',
    hasUnitToggle: true,
    validation: (val) => {
      const n = Number(val);
      if (isNaN(n) || n < 0) return 'Please enter a valid number';
      return null;
    },
    acknowledgement: (val, answers) => {
      const u = unitLabel((answers.units as UnitSystem) || 'km');
      return `${Number(val).toLocaleString()} ${u} — noted!`;
    },
  },

  // Section 3: Riding Habits
  {
    id: 'ridingStyle',
    section: 3,
    botMessages: ["Now let's talk about how you ride.", "What's your primary riding style?"],
    inputType: 'choice',
    choices: [
      { label: 'Daily commuting', value: 'commuting' },
      { label: 'Daily commute + spirited riding', value: 'commute-spirited' },
      { label: 'Weekend touring', value: 'touring' },
      { label: 'Sport / Track', value: 'sport' },
      { label: 'Off-road / Adventure', value: 'off-road' },
      { label: 'A bit of everything', value: 'mixed' },
    ],
  },
  {
    id: 'ridingFrequency',
    section: 3,
    botMessages: ["How often do you ride?"],
    inputType: 'choice',
    choices: [
      { label: 'Daily', value: 'daily' },
      { label: 'A few times a week', value: 'several-weekly' },
      { label: 'Weekends only', value: 'weekends' },
      { label: 'Occasionally', value: 'occasional' },
      { label: 'Seasonal', value: 'seasonal' },
    ],
  },
  {
    id: 'annualMileage',
    section: 3,
    botMessages: ['__MILEAGE_PERIOD_QUESTION__'], // rendered as interactive inline
    inputType: 'choice',
    hasPeriodToggle: true,
    // choices are dynamic — generated from getMileageChoices()
  },

  // Section 4: Environment
  {
    id: 'climate',
    section: 4,
    botMessages: ["What's the climate like where you ride?"],
    inputType: 'choice',
    choices: [
      { label: 'Hot & Dry', value: 'hot-dry' },
      { label: 'Hot & Humid', value: 'hot-humid' },
      { label: 'Temperate', value: 'temperate' },
      { label: 'Cold & Wet', value: 'cold-wet' },
      { label: 'Cold & Snow', value: 'cold' },
      { label: 'Mixed seasons', value: 'mixed' },
    ],
  },
  {
    id: 'storageType',
    section: 4,
    botMessages: ["Where do you store your bike?"],
    inputType: 'choice',
    choices: [
      { label: 'Enclosed garage', value: 'garage' },
      { label: 'Carport / Covered', value: 'carport' },
      { label: 'Outdoors', value: 'outdoor' },
      { label: 'Other', value: 'other' },
    ],
  },

  // Section 5: Experience
  {
    id: 'experienceLevel',
    section: 5,
    botMessages: ["How long have you been riding?"],
    inputType: 'choice',
    choices: [
      { label: 'Less than a year', value: 'beginner' },
      { label: '1-3 years', value: 'intermediate' },
      { label: '3-10 years', value: 'advanced' },
      { label: '10+ years', value: 'expert' },
    ],
    acknowledgement: (val) => {
      if (val === 'beginner') return "Welcome to the riding world!";
      if (val === 'expert') return "A seasoned veteran — respect!";
      if (val === 'advanced') return "You've got some solid miles behind you!";
      return "Nice, you're building up good experience!";
    },
  },
  {
    id: 'maintenanceComfort',
    section: 5,
    botMessages: ["How comfortable are you with doing your own maintenance?"],
    inputType: 'choice',
    choices: [
      { label: "I don't touch it", value: 'none' },
      { label: 'Learning the basics', value: 'beginner' },
      { label: 'Basic stuff (oil, chain)', value: 'basic' },
      { label: 'Intermediate (brakes, filters)', value: 'intermediate' },
      { label: 'I do everything myself', value: 'advanced' },
    ],
    acknowledgement: (val, answers) => getMaintenanceAck(val, answers),
  },

  // Section 6: Maintenance History
  {
    id: 'hasServiceHistory',
    section: 6,
    botMessages: ["Let's talk about your bike's service history.", "Has your bike been serviced before?"],
    inputType: 'choice',
    choices: [
      { label: 'Yes', value: 'yes' },
      { label: 'No / Not sure', value: 'no' },
      { label: 'Just bought it', value: 'new' },
    ],
  },
  // New: has bike been sitting? (only if "Just bought it")
  {
    id: 'bikeSatUp',
    section: 6,
    botMessages: ["Has the bike been sitting for a while before you got it?"],
    inputType: 'choice',
    choices: [
      { label: 'Yes, been sitting a while', value: 'yes' },
      { label: 'No, was being ridden', value: 'no' },
      { label: 'Not sure', value: 'unsure' },
    ],
    skipIf: (answers) => answers.hasServiceHistory !== 'new',
    acknowledgement: (val) => val === 'yes' ? "Good to know — sitting bikes need some extra attention." : "Got it!",
  },
  {
    id: 'bikeSatUpLocation',
    section: 6,
    botMessages: ["Was it stored outside or under shelter?"],
    inputType: 'choice',
    choices: [
      { label: 'Outside / Exposed', value: 'outside' },
      { label: 'Under shelter / Garage', value: 'shelter' },
      { label: 'Not sure', value: 'unsure' },
    ],
    skipIf: (answers) => answers.bikeSatUp !== 'yes',
    acknowledgement: (val) => val === 'outside'
      ? "Noted — we'll make sure to check for weather-related wear."
      : "That's better for the bike. Still worth a thorough check though!",
  },
  {
    id: 'lastServiceDate',
    section: 6,
    botMessages: ["When was the last service? (Approximate is fine)"],
    inputType: 'date',
    placeholder: 'YYYY-MM-DD',
    skipIf: (answers) => answers.hasServiceHistory !== 'yes',
    acknowledgement: "Noted!",
  },
  {
    id: 'lastServiceMileage',
    section: 6,
    botMessages: (answers) => {
      const u = unitLabel((answers.units as UnitSystem) || 'km');
      return [`What was the mileage (${u}) at the last service?`];
    },
    inputType: 'choice',
    choices: (answers) => {
      const u = unitLabel((answers.units as UnitSystem) || 'km');
      return [
        { label: `Enter ${u} manually`, value: '__manual__' },
        { label: "I don't know", value: 'unknown' },
      ];
    },
    hasUnitToggle: true,
    skipIf: (answers) => answers.hasServiceHistory !== 'yes',
  },
  {
    id: 'lastServiceMileageValue',
    section: 6,
    botMessages: (answers) => {
      const u = unitLabel((answers.units as UnitSystem) || 'km');
      return [`Enter the mileage in ${u}:`];
    },
    inputType: 'number',
    placeholder: (answers) => answers.units === 'miles' ? 'e.g. 6200' : 'e.g. 10000',
    hasUnitToggle: true,
    skipIf: (answers) => answers.hasServiceHistory !== 'yes' || answers.lastServiceMileage !== '__manual__',
    validation: (val) => {
      const n = Number(val);
      if (isNaN(n) || n < 0) return 'Please enter a valid number';
      return null;
    },
  },
  {
    id: 'knownIssues',
    section: 6,
    botMessages: ["Any known issues or things that need attention?"],
    inputType: 'choice',
    choices: [
      { label: 'Nope, all good!', value: 'none' },
      { label: 'A few things', value: 'some' },
    ],
    acknowledgement: (val) => val === 'none' ? "Great, a clean slate!" : "No worries, we'll factor that in.",
  },
  {
    id: 'knownIssuesDetail',
    section: 6,
    botMessages: ["Tell me briefly — what needs attention?"],
    inputType: 'text',
    placeholder: 'e.g. chain is worn, brake pads thin...',
    skipIf: (answers) => answers.knownIssues !== 'some',
  },

  // Section 7: Service Preferences
  {
    id: 'servicePreference',
    section: 7,
    botMessages: ["Do you prefer DIY or taking it to a shop?"],
    inputType: 'choice',
    choices: [
      { label: 'DIY when I can', value: 'diy' },
      { label: 'Always take it to a shop', value: 'shop' },
      { label: 'Mix of both', value: 'mixed' },
    ],
  },
  {
    id: 'budgetPriority',
    section: 7,
    botMessages: ["What's your budget priority for parts?"],
    inputType: 'choice',
    choices: [
      { label: 'Keep it cheap', value: 'budget' },
      { label: 'Best value for money', value: 'value' },
      { label: 'Only the best quality', value: 'premium' },
    ],
  },

  // Section 8: Parts Preferences
  {
    id: 'partsPreference',
    section: 8,
    botMessages: ["OEM parts or aftermarket?"],
    inputType: 'choice',
    choices: [
      { label: 'OEM only', value: 'oem' },
      { label: 'Aftermarket is fine', value: 'aftermarket' },
      { label: 'Whatever fits the budget', value: 'any' },
    ],
  },

  // Section 9: Goals
  {
    id: 'maintenanceGoals',
    section: 9,
    botMessages: ["Almost done! What's your main maintenance goal?"],
    inputType: 'choice',
    choices: [
      { label: 'Keep it running reliably', value: 'reliability' },
      { label: 'Maximize performance', value: 'performance' },
      { label: 'Prepare for a long trip', value: 'trip-prep' },
      { label: 'Get it ready to sell', value: 'sell-prep' },
      { label: 'Just general upkeep', value: 'general' },
    ],
  },
  {
    id: 'plannedMods',
    section: 9,
    botMessages: ["Any planned mods or upgrades?"],
    inputType: 'choice',
    choices: [
      { label: 'Nope, keeping it stock', value: 'none' },
      { label: 'Some things in mind', value: 'some' },
    ],
  },
  {
    id: 'plannedModsDetail',
    section: 9,
    botMessages: ["What are you thinking of doing?"],
    inputType: 'text',
    placeholder: 'e.g. exhaust upgrade, suspension...',
    skipIf: (answers) => answers.plannedMods !== 'some',
  },

  // Section 10: Notifications
  {
    id: 'wantNotifications',
    section: 10,
    botMessages: [
      "Almost done!",
      "Would you like to get reminders when maintenance is due?",
    ],
    inputType: 'choice',
    choices: [
      { label: 'Yes, remind me!', value: 'yes' },
      { label: 'No thanks', value: 'no' },
    ],
    acknowledgement: (val: string) =>
      val === 'yes'
        ? "Great — let's set that up real quick."
        : "No problem! You can always turn them on later in Settings.",
  },
  {
    id: 'wantPush',
    section: 10,
    botMessages: ["Want push notifications on your phone?"],
    inputType: 'choice',
    choices: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ],
    skipIf: (answers: Record<string, string>) => answers.wantNotifications !== 'yes',
  },
  {
    id: 'phoneNumber',
    section: 10,
    botMessages: [
      "Want SMS reminders too? Drop your phone number below.",
      "Or just type \"skip\" if you'd rather not.",
    ],
    inputType: 'text',
    placeholder: '+1 555 123 4567',
    skipIf: (answers: Record<string, string>) => answers.wantNotifications !== 'yes',
    validation: (val: string) => {
      if (val.toLowerCase().trim() === 'skip') return null;
      const digits = val.replace(/\D/g, '');
      if (digits.length < 7) return 'Enter a valid phone number or type "skip"';
      return null;
    },
    acknowledgement: (val: string) =>
      val.toLowerCase().trim() === 'skip'
        ? "No worries — you can add it later in Settings."
        : "Got it! We'll text you when maintenance is due.",
  },
  {
    id: 'wantEmail',
    section: 10,
    botMessages: (answers: Record<string, string>) => {
      const hasPhone = answers.phoneNumber && answers.phoneNumber.toLowerCase().trim() !== 'skip';
      return hasPhone
        ? ["How about email reminders too?"]
        : ["Would you like email reminders instead?"];
    },
    inputType: 'choice',
    choices: [
      { label: 'Yes', value: 'yes' },
      { label: 'No', value: 'no' },
    ],
    skipIf: (answers: Record<string, string>) => answers.wantNotifications !== 'yes',
  },

  // Section 11: Confirmation
  {
    id: 'confirm',
    section: 11,
    botMessages: ["That's everything I need! Here's a summary of your bike:"],
    inputType: 'confirm',
    choices: [
      { label: "Looks good, let's go!", value: 'confirm' },
    ],
  },
];

// ─── Typing Indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  const dot1 = useRef(new RNAnimated.Value(0)).current;
  const dot2 = useRef(new RNAnimated.Value(0)).current;
  const dot3 = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: RNAnimated.Value, delay: number) =>
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          RNAnimated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          RNAnimated.delay(600 - delay),
        ])
      );
    animate(dot1, 0).start();
    animate(dot2, 200).start();
    animate(dot3, 400).start();
  }, []);

  const dotStyle = (anim: RNAnimated.Value) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textTertiary,
    marginHorizontal: 3,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={styles.typingContainer}>
      <View style={styles.botBubble}>
        <View style={styles.typingDots}>
          <RNAnimated.View style={dotStyle(dot1)} />
          <RNAnimated.View style={dotStyle(dot2)} />
          <RNAnimated.View style={dotStyle(dot3)} />
        </View>
      </View>
    </View>
  );
}

// ─── Chat Bubble ─────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: Message }) {
  const isBot = message.type === 'bot';
  return (
    <View style={[styles.bubbleRow, isBot ? styles.bubbleRowBot : styles.bubbleRowUser]}>
      <View style={[styles.bubble, isBot ? styles.botBubble : styles.userBubble]}>
        <Text style={[styles.bubbleText, isBot ? styles.botText : styles.userText]}>
          {message.text}
        </Text>
      </View>
    </View>
  );
}

// ─── Inline Period Dropdown ──────────────────────────────────────────────────

function MileagePeriodBubble({
  period,
  onChangePeriod,
}: {
  period: MileagePeriod;
  onChangePeriod: (p: MileagePeriod) => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const periods: { label: string; value: MileagePeriod }[] = [
    { label: 'week', value: 'week' },
    { label: 'month', value: 'month' },
    { label: 'year', value: 'year' },
  ];

  return (
    <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
      <View style={[styles.bubble, styles.botBubble]}>
        <Text style={[styles.bubbleText, styles.botText]}>
          {'Roughly how far do you ride per '}
          <Text
            style={styles.periodDropdownText}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            {period} ▾
          </Text>
          {'?'}
        </Text>
        {showDropdown && (
          <View style={styles.periodDropdown}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.periodDropdownItem,
                  period === p.value && styles.periodDropdownItemActive,
                ]}
                onPress={() => {
                  onChangePeriod(p.value);
                  setShowDropdown(false);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodDropdownItemText,
                    period === p.value && styles.periodDropdownItemTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Unit Toggle ─────────────────────────────────────────────────────────────

function UnitToggle({
  unit,
  onChangeUnit,
}: {
  unit: UnitSystem;
  onChangeUnit: (u: UnitSystem) => void;
}) {
  return (
    <View style={styles.unitToggleRow}>
      <TouchableOpacity
        style={[styles.unitToggleBtn, unit === 'km' && styles.unitToggleBtnActive]}
        onPress={() => onChangeUnit('km')}
        activeOpacity={0.7}
      >
        <Text style={[styles.unitToggleText, unit === 'km' && styles.unitToggleTextActive]}>km</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.unitToggleBtn, unit === 'miles' && styles.unitToggleBtnActive]}
        onPress={() => onChangeUnit('miles')}
        activeOpacity={0.7}
      >
        <Text style={[styles.unitToggleText, unit === 'miles' && styles.unitToggleTextActive]}>miles</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({ answers }: { answers: Record<string, string> }) {
  const u = unitLabel((answers.units as UnitSystem) || 'km');
  const notifParts: string[] = [];
  if (answers.wantNotifications === 'yes') {
    if (answers.wantPush === 'yes') notifParts.push('Push');
    if (answers.phoneNumber && answers.phoneNumber.toLowerCase().trim() !== 'skip') notifParts.push('SMS');
    if (answers.wantEmail === 'yes') notifParts.push('Email');
  }
  const rows = [
    { label: 'Bike', value: `${answers.make} ${answers.model} (${answers.year})` },
    { label: 'Mileage', value: `${Number(answers.mileage).toLocaleString()} ${u}` },
    { label: 'Riding style', value: answers.ridingStyle || '—' },
    { label: 'Climate', value: answers.climate || '—' },
    { label: 'Country', value: answers.country || '—' },
    { label: 'Experience', value: answers.experienceLevel || '—' },
    { label: 'Maintenance comfort', value: answers.maintenanceComfort || '—' },
    { label: 'Notifications', value: notifParts.length > 0 ? notifParts.join(', ') : 'None' },
  ];

  return (
    <View style={styles.summaryCard}>
      {rows.map((row) => (
        <View key={row.label} style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{row.label}</Text>
          <Text style={styles.summaryValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Main Onboarding Screen ──────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [mileagePeriod, setMileagePeriod] = useState<MileagePeriod>('week');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('km');
  const [showMileageBubble, setShowMileageBubble] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const messageIdRef = useRef(0);
  const hasStartedRef = useRef(false);

  const saveOnboarding = useMutation(api.onboarding.save);
  const updateCountry = useMutation(api.users.updateCountry);

  const nextMsgId = () => {
    messageIdRef.current += 1;
    return `msg-${messageIdRef.current}`;
  };

  const addMessage = useCallback((type: 'bot' | 'user', text: string) => {
    setMessages((prev) => [...prev, { id: nextMsgId(), type, text }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendBotMessages = useCallback(async (texts: string[], onDone?: () => void) => {
    for (let i = 0; i < texts.length; i++) {
      // Skip the special marker — rendered as interactive component instead
      if (texts[i] === '__MILEAGE_PERIOD_QUESTION__') {
        setIsTyping(true);
        scrollToBottom();
        await new Promise((r) => setTimeout(r, 800));
        setIsTyping(false);
        setShowMileageBubble(true);
        scrollToBottom();
        continue;
      }
      setIsTyping(true);
      scrollToBottom();
      await new Promise((r) => setTimeout(r, 600 + texts[i].length * 12));
      setIsTyping(false);
      addMessage('bot', texts[i]);
      scrollToBottom();
      if (i < texts.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    onDone?.();
  }, [addMessage, scrollToBottom]);

  const findNextStep = useCallback((fromIndex: number, currentAnswers: Record<string, string>): number => {
    let idx = fromIndex;
    while (idx < INTERVIEW_STEPS.length) {
      const step = INTERVIEW_STEPS[idx];
      if (step.skipIf && step.skipIf(currentAnswers)) {
        idx++;
        continue;
      }
      return idx;
    }
    return idx;
  }, []);

  const presentStep = useCallback(async (stepIndex: number, currentAnswers: Record<string, string>) => {
    if (stepIndex >= INTERVIEW_STEPS.length) return;
    const step = INTERVIEW_STEPS[stepIndex];

    const msgs = typeof step.botMessages === 'function'
      ? step.botMessages(currentAnswers)
      : step.botMessages;

    await sendBotMessages(msgs);

    if (step.inputType === 'confirm') {
      setShowSummary(true);
      scrollToBottom();
    }

    setWaitingForInput(true);
  }, [sendBotMessages, scrollToBottom]);

  // Start the interview
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    const startIdx = findNextStep(0, {});
    setCurrentStepIndex(startIdx);
    presentStep(startIdx, {});
  }, []);

  // Keep unitSystem in sync with the units answer
  useEffect(() => {
    if (answers.units === 'miles') setUnitSystem('miles');
    else if (answers.units === 'km') setUnitSystem('km');
  }, [answers.units]);

  // Convert mileage to km for storage if user uses miles
  const toKm = useCallback((val: string, unit: UnitSystem): number => {
    const n = Number(val);
    return unit === 'miles' ? Math.round(n / KM_TO_MILES) : n;
  }, []);

  const handleAnswer = useCallback(async (value: string) => {
    const step = INTERVIEW_STEPS[currentStepIndex];
    if (!step) return;

    if (step.validation) {
      const error = step.validation(value);
      if (error) {
        setInputError(error);
        return;
      }
    }

    setInputError(null);
    setWaitingForInput(false);
    setInputText('');
    setShowSummary(false);
    setShowMileageBubble(false);

    // Resolve choices for display
    const resolvedChoices = typeof step.choices === 'function'
      ? step.choices(answers)
      : step.choices;
    const displayValue = resolvedChoices?.find((c) => c.value === value)?.label ?? value;
    addMessage('user', displayValue);
    scrollToBottom();

    // For the units step, sync immediately
    let effectiveUnit = unitSystem;
    if (step.id === 'units') {
      effectiveUnit = value as UnitSystem;
      setUnitSystem(effectiveUnit);
    }

    // Save country immediately so currency is set app-wide
    if (step.id === 'country') {
      updateCountry({ country: value }).catch(console.error);
    }

    const newAnswers = { ...answers, [step.id]: value };
    setAnswers(newAnswers);

    // Handle confirmation — save and navigate
    if (step.inputType === 'confirm') {
      setIsSaving(true);
      await sendBotMessages(["Setting up your personalized maintenance plan..."]);

      const currentUnit = (newAnswers.units as UnitSystem) || 'km';
      const mileageKm = toKm(newAnswers.mileage, currentUnit);
      const lastServiceMileageVal = newAnswers.lastServiceMileageValue || newAnswers.lastServiceMileage;
      const lastServiceKm = lastServiceMileageVal && lastServiceMileageVal !== 'unknown' && lastServiceMileageVal !== '__manual__'
        ? toKm(lastServiceMileageVal, currentUnit)
        : undefined;

      try {
        const wantsNotifs = newAnswers.wantNotifications === 'yes';
        const phoneVal = newAnswers.phoneNumber?.toLowerCase().trim() !== 'skip'
          ? newAnswers.phoneNumber
          : undefined;

        await saveOnboarding({
          make: newAnswers.make,
          model: newAnswers.model,
          year: Number(newAnswers.year),
          mileage: mileageKm,
          lastServiceDate: newAnswers.lastServiceDate || undefined,
          lastServiceMileage: lastServiceKm,
          notes: buildNotes(newAnswers),
          ridingStyle: newAnswers.ridingStyle || undefined,
          annualMileage: newAnswers.annualMileage
            ? Number(newAnswers.annualMileage)
            : undefined,
          climate: newAnswers.climate || undefined,
          storageType: newAnswers.storageType || undefined,
          experienceLevel: newAnswers.experienceLevel || undefined,
          maintenanceComfort: newAnswers.maintenanceComfort || undefined,
          country: newAnswers.country || undefined,
          phone: phoneVal || undefined,
          notificationPreferences: {
            push: wantsNotifs && newAnswers.wantPush === 'yes',
            sms: wantsNotifs && !!phoneVal,
            email: wantsNotifs && newAnswers.wantEmail === 'yes',
          },
        });

        await sendBotMessages([
          "All done! Your bike has been added and a maintenance plan is being generated.",
          "Welcome to Apex! 🎉",
        ]);

        setTimeout(() => router.replace('/(tabs)'), 1200);
      } catch (error) {
        console.error('Onboarding save failed:', error);
        await sendBotMessages(["Oops, something went wrong. Let me try again..."]);
        setIsSaving(false);
        setWaitingForInput(true);
        setShowSummary(true);
      }
      return;
    }

    // Acknowledgement
    if (step.acknowledgement) {
      const ack =
        typeof step.acknowledgement === 'function'
          ? step.acknowledgement(value, newAnswers)
          : step.acknowledgement;
      await sendBotMessages([ack]);
    }

    // Move to next step
    const nextIdx = findNextStep(currentStepIndex + 1, newAnswers);
    setCurrentStepIndex(nextIdx);
    if (nextIdx < INTERVIEW_STEPS.length) {
      presentStep(nextIdx, newAnswers);
    }
  }, [currentStepIndex, answers, unitSystem, addMessage, scrollToBottom, sendBotMessages, findNextStep, presentStep, saveOnboarding, toKm]);

  const buildNotes = (a: Record<string, string>): string | undefined => {
    const parts: string[] = [];
    if (a.country) parts.push(`Country: ${a.country}`);
    if (a.knownIssuesDetail) parts.push(`Known issues: ${a.knownIssuesDetail}`);
    if (a.plannedModsDetail) parts.push(`Planned mods: ${a.plannedModsDetail}`);
    if (a.ridingFrequency) parts.push(`Riding frequency: ${a.ridingFrequency}`);
    if (a.servicePreference) parts.push(`Service preference: ${a.servicePreference}`);
    if (a.budgetPriority) parts.push(`Budget priority: ${a.budgetPriority}`);
    if (a.partsPreference) parts.push(`Parts preference: ${a.partsPreference}`);
    if (a.maintenanceGoals) parts.push(`Maintenance goal: ${a.maintenanceGoals}`);
    if (a.bikeSatUp === 'yes') {
      parts.push(`Bike was sitting before purchase (stored: ${a.bikeSatUpLocation || 'unknown'})`);
    }
    if (a.units) parts.push(`Preferred units: ${a.units}`);
    return parts.length > 0 ? parts.join('. ') : undefined;
  };

  const currentStep = currentStepIndex < INTERVIEW_STEPS.length ? INTERVIEW_STEPS[currentStepIndex] : null;
  const progressSection = currentStep ? currentStep.section : TOTAL_SECTIONS;
  const progressPercent = Math.min((progressSection / TOTAL_SECTIONS) * 100, 100);

  // Resolve dynamic choices
  const resolvedChoices = currentStep
    ? (currentStep.hasPeriodToggle
        ? getMileageChoices(mileagePeriod, unitSystem)
        : typeof currentStep.choices === 'function'
          ? currentStep.choices(answers)
          : currentStep.choices)
    : undefined;

  const resolvedPlaceholder = currentStep
    ? (typeof currentStep.placeholder === 'function'
        ? currentStep.placeholder(answers)
        : currentStep.placeholder)
    : undefined;

  const showTextInput =
    waitingForInput &&
    currentStep &&
    (currentStep.inputType === 'text' ||
      currentStep.inputType === 'number' ||
      currentStep.inputType === 'date');

  const showChoices =
    waitingForInput &&
    currentStep &&
    (currentStep.inputType === 'choice' || currentStep.inputType === 'confirm') &&
    resolvedChoices;

  const showChoiceTextFallback =
    showChoices && resolvedPlaceholder && currentStep?.inputType === 'choice';

  const skipOnboarding = useMutation(api.onboarding.skip);

  const handleSkip = useCallback(async () => {
    try {
      await skipOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Skip onboarding failed:', error);
    }
  }, [skipOnboarding]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          {showMileageBubble && (
            <MileagePeriodBubble
              period={mileagePeriod}
              onChangePeriod={setMileagePeriod}
            />
          )}
          {showSummary && (
            <View style={styles.bubbleRow}>
              <SummaryCard answers={answers} />
            </View>
          )}
        </ScrollView>

        {/* Choice Chips */}
        {showChoices && !isSaving && (
          <View style={styles.choicesContainer}>
            {/* Unit toggle for distance questions */}
            {currentStep?.hasUnitToggle && currentStep.inputType === 'choice' && (
              <UnitToggle unit={unitSystem} onChangeUnit={(u) => {
                setUnitSystem(u);
                setAnswers((prev) => ({ ...prev, units: u }));
              }} />
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.choicesContent}
            >
              {resolvedChoices!.map((choice) => (
                <TouchableOpacity
                  key={choice.value}
                  style={styles.choiceChip}
                  onPress={() => handleAnswer(choice.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.choiceChipText}>{choice.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {showChoiceTextFallback && (
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.textInput}
                  placeholder={resolvedPlaceholder}
                  placeholderTextColor={colors.textTertiary}
                  value={inputText}
                  onChangeText={(t) => {
                    setInputText(t);
                    setInputError(null);
                  }}
                  returnKeyType="send"
                  onSubmitEditing={() => {
                    if (inputText.trim()) handleAnswer(inputText.trim());
                  }}
                />
                <TouchableOpacity
                  style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                  onPress={() => {
                    if (inputText.trim()) handleAnswer(inputText.trim());
                  }}
                  disabled={!inputText.trim()}
                >
                  <Send size={18} color={inputText.trim() ? '#FFFFFF' : colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Text / Number Input */}
        {showTextInput && !isSaving && (
          <View style={styles.inputContainer}>
            {currentStep?.hasUnitToggle && (
              <UnitToggle unit={unitSystem} onChangeUnit={(u) => {
                setUnitSystem(u);
                setAnswers((prev) => ({ ...prev, units: u }));
              }} />
            )}
            {inputError && <Text style={styles.inputError}>{inputError}</Text>}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder={resolvedPlaceholder ?? 'Type your answer...'}
                placeholderTextColor={colors.textTertiary}
                value={inputText}
                onChangeText={(t) => {
                  setInputText(t);
                  setInputError(null);
                }}
                keyboardType={
                  currentStep?.inputType === 'number' ? 'numeric' : 'default'
                }
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (inputText.trim()) handleAnswer(inputText.trim());
                }}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
                onPress={() => {
                  if (inputText.trim()) handleAnswer(inputText.trim());
                }}
                disabled={!inputText.trim()}
              >
                <Send size={18} color={inputText.trim() ? '#FFFFFF' : colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Saving indicator */}
        {isSaving && (
          <View style={styles.savingContainer}>
            <ActivityIndicator color={colors.green} size="small" />
            <Text style={styles.savingText}>Setting things up...</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 16,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: colors.surface1,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.green,
    borderRadius: 1.5,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  bubbleRow: {
    marginBottom: 8,
  },
  bubbleRowBot: {
    alignItems: 'flex-start',
  },
  bubbleRowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botBubble: {
    backgroundColor: colors.surface1,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: colors.green,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  botText: {
    color: colors.textPrimary,
  },
  userText: {
    color: '#FFFFFF',
  },
  typingContainer: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  // Choices
  choicesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  choicesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  choiceChip: {
    backgroundColor: colors.surface1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  choiceChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  // Period dropdown (inline in bot bubble)
  periodDropdownText: {
    color: colors.green,
    fontWeight: '700',
    textDecorationLine: 'underline',
    fontSize: 15,
  },
  periodDropdown: {
    flexDirection: 'row',
    marginTop: 10,
    backgroundColor: colors.surface1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  periodDropdownItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  periodDropdownItemActive: {
    backgroundColor: colors.green,
  },
  periodDropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  periodDropdownItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Unit toggle
  unitToggleRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colors.surface1,
    borderRadius: 10,
    padding: 3,
    alignSelf: 'flex-start',
  },
  unitToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  unitToggleBtnActive: {
    backgroundColor: colors.surface2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  unitToggleTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  // Text input
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    paddingHorizontal: 16,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface2,
  },
  inputError: {
    color: colors.red,
    fontSize: 13,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  // Summary
  summaryCard: {
    backgroundColor: colors.surface1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 4,
    maxWidth: '90%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  // Saving
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  savingText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
