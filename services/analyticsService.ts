import { analytics } from './firebaseConfig';
import { logEvent } from 'firebase/analytics';

class AnalyticsService {
  private sessionStartTime: number = 0;
  private cardsReviewedInSession: number = 0;
  private lastSessionDate: string | null = null;
  private currentStreak: number = 0;

  private logEvent(eventName: string, params: any) {
    console.log(`📊 Firebase Event: ${eventName}`, params);
    logEvent(analytics, eventName, params);
  }

  constructor() {
    this.lastSessionDate = localStorage.getItem('lastSessionDate');
    this.currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
    console.log('Analytics initialized:', {
      lastSessionDate: this.lastSessionDate,
      currentStreak: this.currentStreak
    });
  }

  startSession() {
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
}

export const analyticsService = new AnalyticsService(); 