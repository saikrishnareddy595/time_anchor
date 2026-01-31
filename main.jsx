import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, Target, Award, Users, Play, Pause, Settings, TrendingDown, Clock, Zap, Trophy, Share2, RefreshCw } from 'lucide-react';

// Utility functions
const formatTime = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
};

const initializeData = () => {
  const stored = localStorage.getItem('timeAnchorData');
  if (stored) return JSON.parse(stored);
  
  const today = new Date().toISOString().split('T')[0];
  return {
    dailyLimit: 120,
    currentStreak: 3,
    totalPoints: 85,
    achievements: ['first_save'],
    dailyData: {
      [today]: { screenTime: 0, sessions: [], nudgesAccepted: 0, nudgesSnoozed: 0, snoozesUsed: 0 }
    },
    history: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      return {
        date: dateStr,
        screenTime: i === 6 ? 0 : 90 + Math.random() * 60,
        underLimit: i !== 3
      };
    }),
    friends: [
      { name: 'Sarah Chen', saved: 142, streak: 5 },
      { name: 'Mike Torres', saved: 98, streak: 3 },
      { name: 'You', saved: 67, streak: 3 },
      { name: 'Emma Wilson', saved: 54, streak: 2 },
      { name: 'Jordan Lee', saved: 45, streak: 7 },
      { name: 'Alex Kumar', saved: 38, streak: 1 },
    ]
  };
};

const TimeAnchor = () => {
  const [data, setData] = useState(initializeData());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionCategory, setSessionCategory] = useState('social');
  const [autoplay, setAutoplay] = useState(false);
  const [boredomLevel, setBoredomLevel] = useState(50);
  const [currentRisk, setCurrentRisk] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeType, setNudgeType] = useState('');
  const [breakTimer, setBreakTimer] = useState(0);
  const [showBreakTimer, setShowBreakTimer] = useState(false);
  const [intention, setIntention] = useState('');
  const [pitchMode, setPitchMode] = useState(false);
  const [pitchStep, setPitchStep] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [riskHistory, setRiskHistory] = useState([]);
  const sessionCountRef = useRef([]);
  
  const today = new Date().toISOString().split('T')[0];
  const todayData = data.dailyData[today] || { screenTime: 0, sessions: [], nudgesAccepted: 0, nudgesSnoozed: 0, snoozesUsed: 0 };

  // Persist data
  useEffect(() => {
    localStorage.setItem('timeAnchorData', JSON.stringify(data));
  }, [data]);

  // Session timer
  useEffect(() => {
    if (!isSessionActive) return;
    
    const interval = setInterval(() => {
      const increment = pitchMode ? 1 : 1/60; // 1 min/sec in pitch mode, 1 sec normally
      setSessionDuration(prev => prev + increment);
      
      setData(prev => {
        const newData = { ...prev };
        if (!newData.dailyData[today]) {
          newData.dailyData[today] = { screenTime: 0, sessions: [], nudgesAccepted: 0, nudgesSnoozed: 0, snoozesUsed: 0 };
        }
        newData.dailyData[today].screenTime += increment;
        
        // Update history
        const historyIndex = newData.history.findIndex(h => h.date === today);
        if (historyIndex >= 0) {
          newData.history[historyIndex].screenTime = newData.dailyData[today].screenTime;
          newData.history[historyIndex].underLimit = newData.dailyData[today].screenTime < newData.dailyLimit;
        }
        
        return newData;
      });
      
      // Calculate risk
      let risk = 0;
      const categoryRisk = { social: 30, video: 25, news: 20, messaging: 10, work: 5 };
      risk += categoryRisk[sessionCategory];
      if (autoplay) risk += 30;
      risk += (boredomLevel / 100) * 40;
      
      setCurrentRisk(Math.min(100, risk));
      setRiskHistory(prev => [...prev.slice(-19), risk].slice(-20));
      
    }, pitchMode ? 100 : 1000);
    
    return () => clearInterval(interval);
  }, [isSessionActive, pitchMode, sessionCategory, autoplay, boredomLevel, today]);

  // Nudge trigger logic
  useEffect(() => {
    if (!isSessionActive) return;
    
    const checkNudges = () => {
      // High risk for 20+ seconds
      if (currentRisk > 70 && sessionDuration > (pitchMode ? 0.33 : 20/60)) {
        triggerNudge('high_risk');
      }
      // Daily limit exceeded
      else if (todayData.screenTime > data.dailyLimit) {
        triggerNudge('limit_exceeded');
      }
      // Impulsivity check (3 sessions in 10 min)
      else if (sessionCountRef.current.length >= 3) {
        const recentSessions = sessionCountRef.current.slice(-3);
        const timeSpan = Date.now() - recentSessions[0];
        if (timeSpan < 10 * 60 * 1000) {
          triggerNudge('impulsive');
        }
      }
    };
    
    const interval = setInterval(checkNudges, pitchMode ? 500 : 5000);
    return () => clearInterval(interval);
  }, [isSessionActive, currentRisk, sessionDuration, todayData.screenTime, data.dailyLimit, pitchMode]);

  // Break timer
  useEffect(() => {
    if (!showBreakTimer || breakTimer <= 0) return;
    
    const interval = setInterval(() => {
      setBreakTimer(prev => {
        if (prev <= 1) {
          setShowBreakTimer(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [showBreakTimer, breakTimer]);

  const triggerNudge = (type) => {
    if (showNudge) return;
    setNudgeType(type);
    setShowNudge(true);
  };

  const startSession = () => {
    setIsSessionActive(true);
    setSessionStartTime(Date.now());
    setSessionDuration(0);
    sessionCountRef.current = [...sessionCountRef.current, Date.now()];
    setRiskHistory([]);
  };

  const stopSession = () => {
    setIsSessionActive(false);
    setSessionDuration(0);
    setCurrentRisk(0);
    setRiskHistory([]);
  };

  const acceptNudge = () => {
    stopSession();
    setShowNudge(false);
    
    setData(prev => {
      const newData = { ...prev };
      newData.dailyData[today].nudgesAccepted++;
      newData.totalPoints += 10;
      
      // Check achievements
      if (!newData.achievements.includes('no_snooze') && newData.dailyData[today].nudgesSnoozed === 0 && newData.dailyData[today].nudgesAccepted > 0) {
        newData.achievements.push('no_snooze');
      }
      
      return newData;
    });
  };

  const snoozeNudge = () => {
    setData(prev => {
      const newData = { ...prev };
      if (newData.dailyData[today].snoozesUsed >= 2) {
        return prev; // Don't allow more snoozes
      }
      newData.dailyData[today].nudgesSnoozed++;
      newData.dailyData[today].snoozesUsed++;
      newData.totalPoints -= 5;
      return newData;
    });
    setShowNudge(false);
  };

  const takeBreak = () => {
    setBreakTimer(120);
    setShowBreakTimer(true);
    setShowNudge(false);
    stopSession();
  };

  const resetData = () => {
    localStorage.removeItem('timeAnchorData');
    setData(initializeData());
    stopSession();
  };

  const getNudgeMessage = () => {
    switch (nudgeType) {
      case 'high_risk': return 'Mindless scrolling detected. Time to pause?';
      case 'limit_exceeded': return 'Daily limit reached. Take a break?';
      case 'impulsive': return 'You\'ve opened your phone 3 times recently. Everything okay?';
      default: return 'Time for a mindful pause?';
    }
  };

  const calculateSaved = () => {
    const lastWeek = data.history.slice(-7);
    const avgBefore = lastWeek.slice(0, 3).reduce((sum, d) => sum + d.screenTime, 0) / 3;
    const avgRecent = lastWeek.slice(4).reduce((sum, d) => sum + d.screenTime, 0) / 3;
    return Math.max(0, Math.round(avgBefore - avgRecent));
  };

  const generateShareCard = () => {
    const saved = calculateSaved();
    return `🎯 I saved ${saved} minutes this week with Time Anchor!\n⚡ Streak: ${data.currentStreak} days\n🏆 Points: ${data.totalPoints}\n\nJoin me in reclaiming your time!`;
  };

  const checkAchievements = () => {
    const newAchievements = [...data.achievements];
    
    if (data.currentStreak >= 3 && !newAchievements.includes('three_day_streak')) {
      newAchievements.push('three_day_streak');
    }
    
    const saved = calculateSaved();
    if (saved >= 45 && !newAchievements.includes('saved_45')) {
      newAchievements.push('saved_45');
    }
    
    if (newAchievements.length > data.achievements.length) {
      setData(prev => ({ ...prev, achievements: newAchievements }));
    }
  };

  useEffect(() => {
    checkAchievements();
  }, [data.currentStreak, data.history]);

  const achievements = {
    first_save: { icon: '🌱', name: 'First Save', desc: 'Reduced 10 min from yesterday' },
    three_day_streak: { icon: '🔥', name: '3-Day Streak', desc: 'Under limit for 3 days' },
    no_snooze: { icon: '💪', name: 'No Snooze Day', desc: 'Accepted all nudges' },
    saved_45: { icon: '⭐', name: '45 Min Saved', desc: 'Saved 45+ minutes in a week' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-indigo-900 flex items-center gap-2">
                <Clock className="w-8 h-8" />
                Time Anchor
              </h1>
              <p className="text-sm text-gray-600 mt-1">Your digital wellness companion</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPitchMode(!pitchMode)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  pitchMode ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {pitchMode ? '⚡ Pitch Mode' : 'Normal Mode'}
              </button>
              <button
                onClick={resetData}
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                title="Reset Demo Data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>How to share this demo:</strong> In Claude, click "Publish" or "Share" to create a shareable link for investors.
          </div>
        </div>

        {/* Pitch Mode Guide */}
        {pitchMode && pitchStep < 4 && (
          <div className="bg-purple-600 text-white rounded-lg shadow-lg p-6 mb-6 animate-pulse">
            <h3 className="text-xl font-bold mb-2">Pitch Guide - Step {pitchStep + 1}/4</h3>
            <p className="mb-4">
              {pitchStep === 0 && '👉 Start a session in the "Simulator" tab to see real-time tracking'}
              {pitchStep === 1 && '👉 Watch the risk score climb - set autoplay ON and boredom high'}
              {pitchStep === 2 && '👉 A nudge will appear! Accept it to earn points and see rewards'}
              {pitchStep === 3 && '👉 Check "Goals & Rewards" for achievements and "Social" for leaderboard'}
            </p>
            <button
              onClick={() => setPitchStep(pitchStep + 1)}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50"
            >
              {pitchStep === 3 ? 'Start Demo' : 'Next'}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-6 p-2 flex gap-2 overflow-x-auto">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'simulator', icon: Play, label: 'Live Simulator' },
            { id: 'goals', icon: Target, label: 'Goals & Rewards' },
            { id: 'social', icon: Users, label: 'Social' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-sm text-gray-600 mb-1">Today's Screen Time</div>
                <div className="text-3xl font-bold text-indigo-900">{formatTime(todayData.screenTime)}</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-sm text-gray-600 mb-1">Daily Limit</div>
                <div className="text-3xl font-bold text-gray-700">{formatTime(data.dailyLimit)}</div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-sm text-gray-600 mb-1">Remaining</div>
                <div className={`text-3xl font-bold ${
                  todayData.screenTime > data.dailyLimit ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatTime(Math.max(0, data.dailyLimit - todayData.screenTime))}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-sm text-gray-600 mb-1">Current Streak</div>
                <div className="text-3xl font-bold text-orange-600 flex items-center gap-2">
                  🔥 {data.currentStreak}
                </div>
              </div>
            </div>

            {/* Risk Score */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Mindless Scroll Risk</h3>
                <span className="text-sm text-gray-600 cursor-help" title="Based on app category, autoplay, and boredom level">ℹ️</span>
              </div>
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl font-bold">{Math.round(currentRisk)}/100</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    currentRisk > 70 ? 'bg-red-100 text-red-700' :
                    currentRisk > 40 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {currentRisk > 70 ? 'High Risk' : currentRisk > 40 ? 'Moderate' : 'Low Risk'}
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      currentRisk > 70 ? 'bg-red-500' :
                      currentRisk > 40 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${currentRisk}%` }}
                  />
                </div>
              </div>
              {riskHistory.length > 0 && (
                <div className="mt-4 flex items-end gap-1 h-20">
                  {riskHistory.map((risk, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-t ${
                        risk > 70 ? 'bg-red-400' :
                        risk > 40 ? 'bg-yellow-400' :
                        'bg-green-400'
                      }`}
                      style={{ height: `${risk}%` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 7-Day Trend */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">7-Day Trend</h3>
              <div className="flex items-end gap-2 h-40">
                {data.history.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className={`w-full rounded-t transition-all ${
                          day.underLimit ? 'bg-green-400' : 'bg-red-400'
                        }`}
                        style={{ height: `${(day.screenTime / 180) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-400 rounded" />
                  <span className="text-gray-700">Under Limit</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-400 rounded" />
                  <span className="text-gray-700">Over Limit</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simulator Tab */}
        {activeTab === 'simulator' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Session Control</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    onClick={isSessionActive ? stopSession : startSession}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                      isSessionActive
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isSessionActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isSessionActive ? 'Stop Session' : 'Start Session'}
                  </button>
                  {isSessionActive && (
                    <div className="px-6 py-3 bg-indigo-100 text-indigo-900 rounded-lg font-semibold">
                      Duration: {formatTime(sessionDuration)}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">App Category</label>
                  <select
                    value={sessionCategory}
                    onChange={(e) => setSessionCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={!isSessionActive}
                  >
                    <option value="social">Social Media (High Risk)</option>
                    <option value="video">Video Streaming</option>
                    <option value="news">News</option>
                    <option value="messaging">Messaging</option>
                    <option value="work">Work Apps (Low Risk)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Autoplay / Endless Feed</label>
                  <button
                    onClick={() => setAutoplay(!autoplay)}
                    disabled={!isSessionActive}
                    className={`w-14 h-8 rounded-full transition-all ${
                      autoplay ? 'bg-orange-500' : 'bg-gray-300'
                    } ${!isSessionActive && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      autoplay ? 'transform translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    User Boredom Level: {boredomLevel}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={boredomLevel}
                    onChange={(e) => setBoredomLevel(Number(e.target.value))}
                    disabled={!isSessionActive}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Nudge Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Nudges Accepted</div>
                  <div className="text-2xl font-bold text-green-600">{todayData.nudgesAccepted}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Nudges Snoozed</div>
                  <div className="text-2xl font-bold text-orange-600">{todayData.nudgesSnoozed}</div>
                </div>
              </div>
              {todayData.snoozesUsed >= 2 && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                  ⚠️ Snooze limit reached (2/2). Next nudge cannot be snoozed.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Goals & Rewards Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Daily Limit</h3>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={data.dailyLimit}
                  onChange={(e) => setData(prev => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min="30"
                  max="480"
                />
                <span className="text-gray-700">minutes per day</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Average Reduction</div>
                  <div className="text-2xl font-bold text-blue-600">{calculateSaved()} min</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Best Day</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatTime(Math.min(...data.history.map(d => d.screenTime)))}
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Worst Day</div>
                  <div className="text-2xl font-bold text-red-600">
                    {formatTime(Math.max(...data.history.map(d => d.screenTime)))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Achievements</h3>
                <div className="text-sm text-gray-600">{data.achievements.length}/4 unlocked</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(achievements).map(([key, achievement]) => {
                  const unlocked = data.achievements.includes(key);
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        unlocked
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400'
                          : 'bg-gray-50 border-gray-300 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-4xl">{unlocked ? achievement.icon : '🔒'}</div>
                        <div>
                          <div className="font-bold text-gray-900">{achievement.name}</div>
                          <div className="text-sm text-gray-600">{achievement.desc}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Time Bank Points</h3>
              <div className="text-4xl font-bold text-indigo-600 mb-4">{data.totalPoints} points</div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Accept nudge:</span>
                  <span className="text-green-600 font-semibold">+10 points</span>
                </div>
                <div className="flex justify-between">
                  <span>Stay under limit:</span>
                  <span className="text-green-600 font-semibold">+5 points</span>
                </div>
                <div className="flex justify-between">
                  <span>Exceed limit:</span>
                  <span className="text-red-600 font-semibold">-5 points</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Social Tab */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Leaderboard - Minutes Saved This Week</h3>
              <div className="space-y-2">
                {data.friends
                  .sort((a, b) => b.saved - a.saved)
                  .map((friend, index) => (
                    <div
                      key={friend.name}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        friend.name === 'You'
                          ? 'bg-indigo-100 border-2 border-indigo-500'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${
                          index === 0 ? 'text-yellow-500' :
                          index === 1 ? 'text-gray-400' :
                          index === 2 ? 'text-orange-600' :
                          'text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{friend.name}</div>
                          <div className="text-sm text-gray-600">Streak: {friend.streak} days 🔥</div>
                        </div>
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        {friend.saved} min
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                Share Your Progress
              </h3>
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-lg p-6">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {generateShareCard()}
                </pre>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateShareCard());
                  alert('Copied to clipboard!');
                }}
                className="mt-4 w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        )}

        {/* Nudge Modal */}
        {showNudge && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-bounce-in">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⏸️</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{getNudgeMessage()}</h2>
                <p className="text-gray-600">You've been scrolling for {formatTime(sessionDuration)}</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={acceptNudge}
                  className="w-full bg-green-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-green-700 transition-all"
                >
                  ✓ Pause & Reset (+10 points)
                </button>

                <button
                  onClick={takeBreak}
                  className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-all"
                >
                  🧘 Take 2-Min Mindful Break
                </button>

                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    Set an intention (optional):
                  </label>
                  <input
                    type="text"
                    value={intention}
                    onChange={(e) => setIntention(e.target.value)}
                    placeholder="I'm opening my phone to..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                {todayData.snoozesUsed < 2 ? (
                  <button
                    onClick={snoozeNudge}
                    className="w-full bg-gray-300 text-gray-700 px-6 py-4 rounded-lg font-semibold hover:bg-gray-400 transition-all"
                  >
                    😴 Snooze 5 min ({2 - todayData.snoozesUsed} left today)
                  </button>
                ) : (
                  <div className="text-center text-sm text-red-600 font-semibold">
                    No snoozes remaining today. Please choose another option.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Break Timer Modal */}
        {showBreakTimer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
              <div className="text-6xl mb-4">🧘‍♀️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Mindful Break</h2>
              <div className="text-6xl font-bold text-indigo-600 mb-4">
                {Math.floor(breakTimer / 60)}:{(breakTimer % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-gray-600">Take a deep breath. Stretch. Look away from the screen.</p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TimeAnchor;
