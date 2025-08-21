import { NextRequest, NextResponse } from 'next/server';
import { userProfileService } from '../../../services/user-profile';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');
    const searchTerm = searchParams.get('search');

    if (walletAddress) {
      // Get specific user profile
      const profileWithStats = await userProfileService.getProfileWithStats(walletAddress);
      return NextResponse.json(profileWithStats);
    }

    if (searchTerm) {
      // Search users
      const users = await userProfileService.searchUsers(searchTerm);
      return NextResponse.json({ users });
    }

    // Get top users
    const topUsers = await userProfileService.getTopUsers(10);
    return NextResponse.json({ topUsers });

  } catch (error) {
    console.error('❌ Error in profiles API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, username, avatar_url, bio } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check username availability if provided
    if (username) {
      const isAvailable = await userProfileService.isUsernameAvailable(username, walletAddress);
      if (!isAvailable) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        );
      }
    }

    // Create or update profile
    const profile = await userProfileService.createOrUpdateProfile(walletAddress, {
      username,
      avatar_url,
      bio
    });

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('❌ Error creating/updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to create/update profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, field, value } = body;

    if (!walletAddress || !field) {
      return NextResponse.json(
        { error: 'Wallet address and field are required' },
        { status: 400 }
      );
    }

    let profile;

    switch (field) {
      case 'avatar':
        profile = await userProfileService.updateAvatar(walletAddress, value);
        break;
      case 'bio':
        profile = await userProfileService.updateBio(walletAddress, value);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid field' },
          { status: 400 }
        );
    }

    return NextResponse.json({ profile });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
