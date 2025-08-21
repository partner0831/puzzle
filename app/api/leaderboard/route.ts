import { NextRequest, NextResponse } from 'next/server';
import { leaderboardService } from '../../../services/leaderboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const limit = parseInt(searchParams.get('limit') || '50');
    const walletAddress = searchParams.get('walletAddress');
    const context = parseInt(searchParams.get('context') || '5');

    // Validate type
    if (!['daily', 'weekly', 'all_time'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid leaderboard type. Must be daily, weekly, or all_time' },
        { status: 400 }
      );
    }

    let leaderboard;

    if (walletAddress) {
      // Get leaderboard around specific user
      leaderboard = await leaderboardService.getLeaderboardAroundUser(
        walletAddress,
        type as 'daily' | 'weekly' | 'all_time',
        context
      );
    } else {
      // Get cached leaderboard
      leaderboard = await leaderboardService.getCachedLeaderboard(
        type as 'daily' | 'weekly' | 'all_time',
        limit
      );
    }

    // Get leaderboard stats
    const stats = await leaderboardService.getLeaderboardStats();

    return NextResponse.json({
      type,
      leaderboard,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in leaderboard API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;

    if (!type || !['daily', 'weekly', 'all_time'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid leaderboard type. Must be daily, weekly, or all_time' },
        { status: 400 }
      );
    }

    // Update leaderboard cache
    await leaderboardService.updateLeaderboardCache(type as 'daily' | 'weekly' | 'all_time');

    return NextResponse.json({
      message: `${type} leaderboard cache updated successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating leaderboard cache:', error);
    return NextResponse.json(
      { error: 'Failed to update leaderboard cache' },
      { status: 500 }
    );
  }
}
