import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_GAP = 6;
// SCREEN_WIDTH - (paddingHorizontal 24 * 2) - (container padding 16 * 2) = SCREEN_WIDTH - 80
const GRID_WIDTH = SCREEN_WIDTH - 80;
const CELL_SIZE = Math.floor((GRID_WIDTH - (CELL_GAP * 6)) / 7);

interface Props {
  monthDate: Date;
  sessions: any[];
  leaves: any[];
  weeklyHolidays: string[];
  onDayPress: (day: Date) => void;
}

export function MonthlyHeatmap({ monthDate, sessions, leaves = [], weeklyHolidays = [], onDayPress }: Props) {
  const { colors, theme } = useTheme();

  const days = useMemo(() => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const interval = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Padding for Sunday start
    const startDay = getDay(monthStart);
    const padding = Array(startDay).fill(null);
    
    return [...padding, ...interval];
  }, [monthDate]);

  const renderCell = (day: Date | null, index: number) => {
    if (!day) return <View key={`pad-${index}`} style={styles.emptyCell} />;

    const daySessions = sessions.filter(s => isSameDay(new Date(s.punch_in_time), day));
    const leave = leaves.find(l => isSameDay(new Date(l.leave_date), day));
    const isToday = isSameDay(day, new Date());
    const isHoliday = weeklyHolidays.includes(getDay(day).toString());

    let status = 'empty';
    if (leave) {
      status = 'leave';
    } else if (daySessions.length > 0) {
      // Logic from web: 8h net AND 9h gross
      const totalNetMs = daySessions.reduce((acc, s) => {
        if (!s.punch_out_time) return acc;
        const bMs = (s.breaks || []).reduce((ba: number, b: any) => 
            b.break_start && b.break_end ? ba + (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) : ba, 0);
        return acc + (new Date(s.punch_out_time).getTime() - new Date(s.punch_in_time).getTime() - bMs);
      }, 0);

      const mins = daySessions.map(s => new Date(s.punch_in_time).getTime());
      const maxs = daySessions.map(s => s.punch_out_time ? new Date(s.punch_out_time).getTime() : Date.now());
      const totalGrossMs = Math.max(...maxs) - Math.min(...mins);

      status = (totalNetMs >= 8 * 3600000 && totalGrossMs >= 9 * 3600000) ? 'success' : 'failed';
    } else if (isHoliday) {
        status = 'holiday';
    }

    let bgColor = colors.muted + '20';
    let textColor = colors.mutedForeground;
    let borderColor = 'transparent';

    if (status === 'success') {
      bgColor = '#10b981';
      textColor = '#fff';
    } else if (status === 'failed') {
      bgColor = '#f59e0b';
      textColor = '#fff';
    } else if (status === 'leave') {
      if (leave.leave_type === 'sick') bgColor = '#f43f5e';
      else if (leave.leave_type === 'casual') bgColor = '#0ea5e9';
      else if (leave.leave_type === 'wfh') bgColor = '#14b8a6';
      else bgColor = '#8b5cf6';
      textColor = '#fff';
    } else if (status === 'holiday') {
        bgColor = colors.muted + '40';
        textColor = colors.mutedForeground + '80';
    }

    return (
      <TouchableOpacity
        key={day.toISOString()}
        onPress={() => onDayPress(day)}
        style={[
          styles.cell,
          { backgroundColor: bgColor, borderColor },
          isToday && { borderWidth: 2, borderColor: colors.primary }
        ]}
      >
        <Text style={[styles.cellText, { color: textColor }]}>
          {format(day, 'd')}
        </Text>
        
        {status === 'holiday' && !leave && daySessions.length === 0 && (
            <Text style={[styles.holidayLabel, { color: textColor }]}>H</Text>
        )}

        {daySessions.length > 0 && !leave && (
            <View style={styles.dotContainer}>
                {Array(Math.min(3, daySessions.length)).fill(0).map((_, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: textColor + '80' }]} />
                ))}
            </View>
        )}
      </TouchableOpacity>
    );
  };

  // Group days into rows of 7
  const rows = useMemo(() => {
    const r = [];
    for (let i = 0; i < days.length; i += 7) {
      r.push(days.slice(i, i + 7));
    }
    return r;
  }, [days]);

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.weekHeaders}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={[styles.weekHeaderText, { color: colors.mutedForeground }]}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((day, i) => renderCell(day, i))}
            {/* Pad the last row if it's not full */}
            {row.length < 7 && Array(7 - row.length).fill(null).map((_, i) => (
                <View key={`last-pad-${i}`} style={styles.emptyCell} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginVertical: 12,
  },
  weekHeaders: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: 8,
  },
  weekHeaderText: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    opacity: 0.4,
  },
  grid: {
    gap: CELL_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  cellText: {
    fontSize: 11,
    fontWeight: '800',
  },
  holidayLabel: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 7,
    fontWeight: '900',
    opacity: 0.5,
  },
  dotContainer: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
  },
  dot: {
    width: 2,
    height: 2,
    borderRadius: 1,
  }
});
