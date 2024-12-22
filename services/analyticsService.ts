import { getAnalyticsInstance, getDbInstance } from './firebaseConfig';
import { logEvent, Analytics } from 'firebase/analytics';
import { ref, get, set, update } from 'firebase/database';

class AnalyticsService {
  private sessionStartTime: number = 0;
  private cardsReviewedInSession: number = 0;
  private lastSessionDate: string | null = null;
  private currentStreak: number = 0;
  private initialized: boolean = false;
  private analyticsInstance: Analytics | null = null;

  private async logEvent(eventName: string, params: any) {
    if (typeof window === 'undefined') return;
    
    console.log(`📊 Firebase Event: ${eventName}`, params);
    if (this.analyticsInstance) {
      logEvent(this.analyticsInstance, eventName, params);
    }
  }

  private async initialize() {
    if (typeof window === 'undefined') return;
    if (this.initialized) return;
    
    this.analyticsInstance = await getAnalyticsInstance();
    
    this.lastSessionDate = localStorage.getItem('lastSessionDate');
    this.currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
    
    this.initialized = true;
  }

  startSession() {
    if (typeof window === 'undefined') return;
    
    this.initialize();
    console.log('Starting new session...');
    this.sessionStartTime = Date.now();
    this.cardsReviewedInSession = 0;
    
    const today = new Date().toDateString();
    if (this.lastSessionDate) {
      const lastDate = new Date(this.lastSessionDate);
      const daysBetween = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysBetween === 1) {
        this.currentStreak++;
        console.log('🔥 Streak increased:', this.currentStreak);
      } else if (daysBetween > 1) {
        console.log('💔 Streak reset: too many days between sessions:', daysBetween);
        this.currentStreak = 1;
      } else {
        console.log('📝 Same day session - streak unchanged');
      }
      
      this.logEvent('study_streak', {
        current_streak: this.currentStreak,
        days_between_sessions: daysBetween,
        streak_maintained: daysBetween === 1
      });
    } else {
      console.log('👋 First time studying!');
      this.currentStreak = 1;
      this.logEvent('study_streak', {
        current_streak: 1,
        is_first_session: true
      });
    }
    
    this.lastSessionDate = today;
    localStorage.setItem('lastSessionDate', today);
    localStorage.setItem('currentStreak', this.currentStreak.toString());
    
    this.logEvent('session_start', {
      time_of_day: new Date().getHours(),
      day_of_week: new Date().getDay()
    });
  }

  endSession() {
    if (typeof window === 'undefined') return;
    
    const sessionLength = Math.round((Date.now() - this.sessionStartTime) / 1000);
    console.log('Session ended:', {
      duration: sessionLength + 's',
      cardsReviewed: this.cardsReviewedInSession
    });
    
    this.logEvent('session_end', {
      session_length: sessionLength,
      cards_reviewed: this.cardsReviewedInSession
    });
  }

  logCardReview(grade: string, responseTime: number, cardState: string) {
    if (typeof window === 'undefined') return;
    
    this.initialize();
    this.cardsReviewedInSession++;
    
    const params = {
      grade,
      response_time: responseTime,
      cards_in_session: this.cardsReviewedInSession,
      card_state: cardState
    };

    console.log('Card review:', {
      ...params,
      responseTime: responseTime + 's'});

    this.logEvent('card_review', params);
  }

  logProblemCard(cardId: string, text: string, consecutiveAgainCount: number) {
    if (typeof window === 'undefined') return;
    
    if (consecutiveAgainCount >= 2) {
      const params = {
        card_id: cardId,
        text,
        consecutive_again_count: consecutiveAgainCount
      };

      console.log('⚠️ Problem card detected:', params);
      this.logEvent('problem_card', params);
    }
  }

  logUserLogin(username: string) {
    if (typeof window === 'undefined') return;
    
    const lastLoginDate = localStorage.getItem(`lastLogin_${username}`);
    const today = new Date().toDateString();
    
    let params;
    if (lastLoginDate) {
      const daysSinceLastLogin = Math.floor(
        (new Date(today).getTime() - new Date(lastLoginDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      params = {
        username,
        days_since_last_login: daysSinceLastLogin,
        is_returning_user: true
      };
      console.log('👤 Returning user:', params);
    } else {
      params = {
        username,
        is_returning_user: false
      };
      console.log('👋 New user login:', params);
    }
    
    this.logEvent('user_login', params);
    localStorage.setItem(`lastLogin_${username}`, today);
  }

  logUserSignup(username: string) {
    const params = {
      username,
      signup_hour: new Date().getHours(),
      signup_day: new Date().getDay()
    };
    console.log('✨ New user signup:', params);
    this.logEvent('user_signup', params);
  }

  async updateUserAnalytics(username: string, reviewData: {
    wordId: string,
    timeUsed: number,
    difficulty: number,
    isMastered: boolean,
    isCorrect: number
  }) {
    const db = getDbInstance();
    const analyticsRef = ref(db, `analytics/${username}`);
    
    // Get today's date in EST timezone so dailyprogress ตัดตอนเที่ยง
    const now = new Date();
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = estDate.getFullYear();
    const month = String(estDate.getMonth() + 1).padStart(2, '0');
    const day = String(estDate.getDate()).padStart(2, '0');
    const today = parseInt(`${year}${month}${day}`);
    
    console.log('Today date key (EST):', today);
    console.log('EST time:', estDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));

    // Get existing analytics data
    const snapshot = await get(analyticsRef);
    
    if (!snapshot.exists()) {
      console.log('First time user - creating new analytics');
      // First time initialization - need to calculate from user data
      const userRef = ref(db, `users/${username}/words`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const words = userSnapshot.val();
        let totalCardsEncountered = 0;
        let masteredCards = 0;
        
        Object.values(words).forEach((word: any) => {
          if (word.card) {
            const hasBeenReviewed = word.card.reps !== undefined && word.card.reps > 0;
            if (hasBeenReviewed) {
              totalCardsEncountered++;
              if (word.card.difficulty !== undefined && word.card.difficulty < 5) {
                masteredCards++;
              }
            }
          }
        });

        // Initialize analytics with historical data - all numeric fields as arrays
        const analytics = {
          study_days: [today],
          total_cards_reviewed: [totalCardsEncountered + (reviewData.wordId in words ? 0 : 1)],
          mastered_cards: [masteredCards],
          daily_cards_reviewed: [1],
          daily_session_time: [reviewData.timeUsed],
          words: {
            [reviewData.wordId]: {
              time_used: [reviewData.timeUsed],
              difficulty: [reviewData.difficulty],
              is_correct: [reviewData.isCorrect]
            }
          }
        };
        
        await update(analyticsRef, analytics);
        return;
      }
    }

    // Get existing analytics or create new one
    let analytics = snapshot.val() || {
      study_days: [today],
      total_cards_reviewed: [1],
      mastered_cards: [0],
      daily_cards_reviewed: [1],
      daily_session_time: [reviewData.timeUsed],
      words: {
        [reviewData.wordId]: {
          time_used: [reviewData.timeUsed],
          difficulty: [reviewData.difficulty],
          is_correct: [reviewData.isCorrect]
        }
      }
    };

    // Convert all numeric collections to arrays if they're objects
    const arrayFields = ['study_days', 'total_cards_reviewed', 'mastered_cards', 'daily_cards_reviewed', 'daily_session_time'];
    arrayFields.forEach(field => {
      if (analytics[field] && !Array.isArray(analytics[field])) {
        console.log(`Converting ${field} to array:`, analytics[field]);
        analytics[field] = Object.values(analytics[field]);
      }
    });

    // Also ensure word-specific arrays are arrays
    Object.keys(analytics.words).forEach(wordId => {
      const word = analytics.words[wordId];
      if (word.time_used && !Array.isArray(word.time_used)) {
        word.time_used = Object.values(word.time_used);
      }
      if (word.difficulty && !Array.isArray(word.difficulty)) {
        word.difficulty = Object.values(word.difficulty);
      }
      if (word.is_correct && !Array.isArray(word.is_correct)) {
        word.is_correct = Object.values(word.is_correct);
      }
      if (!word.is_correct) {
        word.is_correct = word.difficulty.map((grade: number) => grade === 1 ? 0 : 1);  // 1 is Grade.Again
      }
    });

    // Find the correct day index
    const todayIndex = analytics.study_days.indexOf(today);
    const lastStudyDay = analytics.study_days[analytics.study_days.length - 1];
    
    console.log('Current analytics state:', {
      study_days: analytics.study_days,
      today,
      todayIndex,
      lastStudyDay,
      daily_cards_reviewed: analytics.daily_cards_reviewed
    });

    if (todayIndex === -1) {
      console.log('New study day detected');
      // Today is a new study day
      // Calculate how many days we need to fill with zeros
      const daysToFill = lastStudyDay < today ? 
        Math.floor((today - lastStudyDay) / 10000) - 1 : 0;
      
      console.log('Days to fill:', daysToFill);

      // Fill gaps with zeros if there are missing days
      for (let i = 0; i < daysToFill; i++) {
        const gapDay = lastStudyDay + ((i + 1) * 10000);
        console.log('Adding gap day:', gapDay);
        analytics.study_days.push(gapDay);
        analytics.daily_cards_reviewed.push(0);
        analytics.daily_session_time.push(0);
        analytics.total_cards_reviewed.push(analytics.total_cards_reviewed[analytics.total_cards_reviewed.length - 1]);
        analytics.mastered_cards.push(analytics.mastered_cards[analytics.mastered_cards.length - 1]);
      }

      // Add today's initial data
      console.log('Adding today\'s data at new index');
      analytics.study_days.push(today);
      analytics.daily_cards_reviewed.push(1);
      analytics.daily_session_time.push(reviewData.timeUsed);
      
      // Get current total cards reviewed and mastered cards
      const userRef = ref(db, `users/${username}/words`);
      const userSnapshot = await get(userRef);
      let currentTotalCards = 0;
      let currentMasteredCards = 0;
      
      if (userSnapshot.exists()) {
        const words = userSnapshot.val();
        Object.values(words).forEach((word: any) => {
          if (word.card) {
            const hasBeenReviewed = word.card.reps !== undefined && word.card.reps > 0;
            if (hasBeenReviewed) {
              currentTotalCards++;
              if (word.card.difficulty !== undefined && word.card.difficulty < 5) {
                currentMasteredCards++;
              }
            }
          }
        });
      }
      analytics.total_cards_reviewed.push(currentTotalCards);
      analytics.mastered_cards.push(currentMasteredCards);
    } else {
      console.log('Updating existing day at index:', todayIndex);
      // Update today's data
      analytics.daily_cards_reviewed[todayIndex] = (analytics.daily_cards_reviewed[todayIndex] || 0) + 1;
      analytics.daily_session_time[todayIndex] = (analytics.daily_session_time[todayIndex] || 0) + reviewData.timeUsed;
      
      // Get current total cards reviewed and mastered cards
      const userRef = ref(db, `users/${username}/words`);
      const userSnapshot = await get(userRef);
      let currentTotalCards = 0;
      let currentMasteredCards = 0;
      
      if (userSnapshot.exists()) {
        const words = userSnapshot.val();
        Object.values(words).forEach((word: any) => {
          if (word.card) {
            const hasBeenReviewed = word.card.reps !== undefined && word.card.reps > 0;
            if (hasBeenReviewed) {
              currentTotalCards++;
              if (word.card.difficulty !== undefined && word.card.difficulty < 5) {
                currentMasteredCards++;
              }
            }
          }
        });
        analytics.total_cards_reviewed[todayIndex] = currentTotalCards;
        analytics.mastered_cards[todayIndex] = currentMasteredCards;
      }
    }

    // Update word-specific stats - ensure arrays
    if (!analytics.words[reviewData.wordId]) {
      analytics.words[reviewData.wordId] = {
        time_used: [reviewData.timeUsed],
        difficulty: [reviewData.difficulty],
        is_correct: [reviewData.isCorrect]
      };
    } else {
      const word = analytics.words[reviewData.wordId];
      if (!Array.isArray(word.time_used)) {
        word.time_used = Object.values(word.time_used);
      }
      if (!Array.isArray(word.difficulty)) {
        word.difficulty = Object.values(word.difficulty);
      }
      if (!Array.isArray(word.is_correct)) {
        word.is_correct = Object.values(word.is_correct);
      }
      word.time_used.push(reviewData.timeUsed);
      word.difficulty.push(reviewData.difficulty);
      word.is_correct.push(reviewData.isCorrect);
    }

    console.log('Final analytics state before update:', {
      study_days: analytics.study_days,
      daily_cards_reviewed: analytics.daily_cards_reviewed,
      daily_session_time: analytics.daily_session_time
    });

    await update(analyticsRef, analytics);
  }
}

export const analyticsService = new AnalyticsService();

const username = localStorage.getItem('username');
console.log('Current username:', username);

const db = getDbInstance();
const analyticsRef = ref(db, `analytics/${username}`);
get(analyticsRef).then(snapshot => {
  console.log('Analytics data:', snapshot.val());
});