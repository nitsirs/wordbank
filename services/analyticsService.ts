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
    isMastered: boolean
  }) {
    const db = getDbInstance();
    const analyticsRef = ref(db, `analytics/${username}`);
    const today = parseInt(new Date().toISOString().split('T')[0].replace(/-/g, ''));

    // Get existing analytics data
    const snapshot = await get(analyticsRef);
    
    if (!snapshot.exists()) {
      // First time initialization - need to calculate from user data
      const userRef = ref(db, `users/${username}/words`);
      const userSnapshot = await get(userRef);
      
      if (userSnapshot.exists()) {
        const words = userSnapshot.val();
        let totalCardsEncountered = 0;
        let masteredCards = 0;
        
        // Count total unique cards encountered and mastered cards
        Object.values(words).forEach((word: any) => {
          if (word.card) {
            const hasBeenReviewed = word.card.reps !== undefined && word.card.reps > 0;
            // Count unique cards encountered (reps > 0)
            if (hasBeenReviewed) {
              totalCardsEncountered++;
              // Only count as mastered if the card has been reviewed AND difficulty < 5
              if (word.card.difficulty !== undefined && word.card.difficulty < 5) {
                masteredCards++;
              }
            }
          }
        });

        // Initialize analytics with historical data
        const analytics = {
          study_days: [today],
          total_cards_reviewed: [totalCardsEncountered + (reviewData.wordId in words ? 0 : 1)], // Only add 1 if it's a new word
          mastered_cards: [masteredCards], // Don't add current review yet as it's included in the user data
          daily_cards_reviewed: [1],
          daily_session_time: [reviewData.timeUsed],
          words: {
            [reviewData.wordId]: {
              time_used: [reviewData.timeUsed],
              difficulty: [reviewData.difficulty]
            }
          }
        };
        
        await set(analyticsRef, analytics);
        return;
      }
    }

    // Normal flow for existing analytics data
    const analytics = snapshot.val() || {
      study_days: [today],
      total_cards_reviewed: [1],
      mastered_cards: [0], // Start at 0 and let the recalculation handle it
      daily_cards_reviewed: [1],
      daily_session_time: [reviewData.timeUsed],
      words: {
        [reviewData.wordId]: {
          time_used: [reviewData.timeUsed],
          difficulty: [reviewData.difficulty]
        }
      }
    };

    if (analytics.study_days[analytics.study_days.length - 1] !== today) {
      // New day
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
              // Only count as mastered if the card has been reviewed AND difficulty < 5
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
      // Same day - update the last values
      const lastIndex = analytics.study_days.length - 1;
      analytics.daily_cards_reviewed[lastIndex]++;
      analytics.daily_session_time[lastIndex] += reviewData.timeUsed;
      
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
              // Only count as mastered if the card has been reviewed AND difficulty < 5
              if (word.card.difficulty !== undefined && word.card.difficulty < 5) {
                currentMasteredCards++;
              }
            }
          }
        });
        analytics.total_cards_reviewed[lastIndex] = currentTotalCards;
        analytics.mastered_cards[lastIndex] = currentMasteredCards;
      }
    }

    // Update word-specific stats
    if (!analytics.words[reviewData.wordId]) {
      analytics.words[reviewData.wordId] = {
        time_used: [reviewData.timeUsed],
        difficulty: [reviewData.difficulty]
      };
    } else {
      analytics.words[reviewData.wordId].time_used.push(reviewData.timeUsed);
      analytics.words[reviewData.wordId].difficulty.push(reviewData.difficulty);
    }

    await set(analyticsRef, analytics);
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