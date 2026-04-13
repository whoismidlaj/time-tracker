import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { Target, Clock, TrendingUp, LogIn, LogOut, Coffee } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { formatShortDuration } from '../lib/utils';

interface Props {
  monthDate: Date;
  sessions: any[];
  leaves: any[];
  weeklyHolidays: string[];
}

export function MonthlyReportCard({ monthDate, sessions, leaves = [], weeklyHolidays }: Props) {
  const { colors, theme } = useTheme();

  const stats = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    let totalNetMs = 0;
    let successDays = 0;
    let workingDays = 0;
    let punchInMinutes: number[] = [];
    let punchOutMinutes: number[] = [];
    let totalBreakMs = 0;
    let sessionsCount = 0;

    days.forEach(day => {
      const dayOfWeek = getDay(day).toString();
      const isHoliday = weeklyHolidays.includes(dayOfWeek);
      const isLeave = leaves.some(l => isSameDay(new Date(l.leave_date), day));
      
      const daySessions = sessions.filter(s => isSameDay(new Date(s.punch_in_time), day));
      
      if (!isHoliday && !isLeave) workingDays++;
      
      if (daySessions.length > 0) {
        sessionsCount += daySessions.length;
        
        const dayNetMs = daySessions.reduce((acc, s) => {
          if (!s.punch_out_time) return acc;
          const brks = s.breaks || [];
          const bMs = brks.reduce((ba: number, b: any) => 
            b.break_start && b.break_end ? ba + (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) : ba, 0);
          totalBreakMs += bMs;
          return acc + (new Date(s.punch_out_time).getTime() - new Date(s.punch_in_time).getTime() - bMs);
        }, 0);
        totalNetMs += dayNetMs;

        const mins = daySessions.map(s => new Date(s.punch_in_time).getTime());
        const maxs = daySessions.map(s => s.punch_out_time ? new Date(s.punch_out_time).getTime() : Date.now());
        const dayGrossMs = Math.max(...maxs) - Math.min(...mins);

        const firstIn = new Date(Math.min(...mins));
        punchInMinutes.push(firstIn.getHours() * 60 + firstIn.getMinutes());
        
        const lastOut = new Date(Math.max(...maxs));
        punchOutMinutes.push(lastOut.getHours() * 60 + lastOut.getMinutes());

        if (dayNetMs >= 8 * 3600000 && dayGrossMs >= 9 * 3600000) {
          successDays++;
        }
      }
    });

    const formatMinutes = (total: number) => {
      if (isNaN(total)) return '--:--';
      const h = Math.floor(total / 60);
      const m = Math.round(total % 60);
      const period = h >= 12 ? 'PM' : 'AM';
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
    };

    return {
      totalNetMs,
      successRate: workingDays > 0 ? (successDays / workingDays) * 100 : 0,
      avgIn: formatMinutes(punchInMinutes.reduce((a, b) => a + b, 0) / punchInMinutes.length),
      avgOut: formatMinutes(punchOutMinutes.reduce((a, b) => a + b, 0) / punchOutMinutes.length),
      totalBreakMs,
      avgNetMs: punchInMinutes.length ? totalNetMs / punchInMinutes.length : 0,
      sessionsCount
    };
  }, [monthDate, sessions, leaves, weeklyHolidays]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerItem}>
          <View style={styles.labelRow}>
            <Target size={12} color="#10b981" />
            <Text style={[styles.labelText, { color: colors.mutedForeground }]}>SUCCESS RATE</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.mainValue, { color: colors.foreground }]}>{Math.round(stats.successRate)}%</Text>
            <Text style={[styles.subValue, { color: colors.mutedForeground }]}>consistency</Text>
          </View>
        </View>
        <View style={[styles.headerItem, { alignItems: 'flex-end' }]}>
          <View style={styles.labelRow}>
            <Text style={[styles.labelText, { color: colors.mutedForeground }]}>TOTAL EFFORT</Text>
            <Clock size={12} color={colors.primary} />
          </View>
          <View style={styles.valueRow}>
            <Text style={[styles.mainValue, { color: colors.foreground }]}>{Math.floor(stats.totalNetMs / 3600000)}h</Text>
            <Text style={[styles.subValue, { color: colors.mutedForeground }]}>worked</Text>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border + '30' }]} />

      <View style={styles.metricsGrid}>
        <View style={[styles.metricBox, { backgroundColor: colors.muted + '20' }]}>
          <LogIn size={12} color="#10b981" style={{ opacity: 0.7, marginBottom: 4 }} />
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>AVG IN</Text>
          <Text style={[styles.metricValue, { color: colors.foreground }]}>{stats.avgIn}</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: colors.muted + '20' }]}>
          <LogOut size={12} color="#f59e0b" style={{ opacity: 0.7, marginBottom: 4 }} />
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>AVG OUT</Text>
          <Text style={[styles.metricValue, { color: colors.foreground }]}>{stats.avgOut}</Text>
        </View>
        <View style={[styles.metricBox, { backgroundColor: colors.muted + '20' }]}>
          <Coffee size={12} color={colors.primary} style={{ opacity: 0.7, marginBottom: 4 }} />
          <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>BREAKS</Text>
          <Text style={[styles.metricValue, { color: colors.foreground }]}>{formatShortDuration(stats.totalBreakMs)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerStats}>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            <Text style={{ color: colors.foreground, fontWeight: '800' }}>{stats.sessionsCount}</Text> sessions
          </Text>
          <View style={[styles.dot, { backgroundColor: colors.border }]} />
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Avg <Text style={{ color: colors.foreground, fontWeight: '800' }}>{formatShortDuration(stats.avgNetMs)}</Text>/day
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
    marginVertical: 12,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerItem: {
    gap: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  labelText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  mainValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  subValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  }
});
