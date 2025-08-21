"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Trophy, Users, Clock, Gift, Star } from "lucide-react";
import {
  calculateCommunityJackpot,
  formatJackpotAmount,
  getWeeklyJackpotInfo,
  getDailyPlayerCount,
  getWeeklyPlayerCount,
  getToppingsAvailableToClaim,
  getTotalToppingsClaimed,
  selectWeeklyJackpotWinners,
  payWeeklyJackpotWinners,
  getUserClaimableToppings,
  canClaimToppings,
  getTimeUntilClaimingWindow,
  isWeeklyJackpotTime,
} from "@/lib/jackpot-data";
import { getVMFBalanceUltimate } from "@/lib/vmf-contract";
import { useWallet } from "@/hooks/useWallet";
import Image from "next/image";

export default function JackpotPage() {
  const customFontStyle = {
    fontFamily:
      '"Comic Sans MS", "Marker Felt", "Chalkduster", "Kalam", "Caveat", cursive',
    fontWeight: "bold" as const,
  };

  // Wallet connection state
  const { isConnected, connection } = useWallet();

  const [communityJackpot, setCommunityJackpot] = useState(0);
  const [dailyPlayers, setDailyPlayers] = useState(0);
  const [weeklyPlayers, setWeeklyPlayers] = useState(0);
  const [toppingsAvailable, setToppingsAvailable] = useState(0);
  const [totalVMFInJackpot, setTotalVMFInJackpot] = useState(0);
  const [userClaimableToppings, setUserClaimableToppings] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [timeUntilClaiming, setTimeUntilClaiming] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [winners, setWinners] = useState<string[]>([]);
  const [isDrawComplete, setIsDrawComplete] = useState(false);
  const [weeklyInfo, setWeeklyInfo] = useState({
    totalToppings: 0,
    totalPlayers: 0,
    timeUntilDraw: {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
  });

  // Load all real data
  const loadRealData = async () => {
    const jackpot = calculateCommunityJackpot();
    const daily = getDailyPlayerCount();
    const weekly = getWeeklyPlayerCount();
    const toppings = getToppingsAvailableToClaim();
    const info = getWeeklyJackpotInfo();

    // Calculate total VMF in jackpot (1 topping = 1 VMF)
    const totalToppings = getTotalToppingsClaimed();
    const vmfInJackpot = totalToppings;

    // Calculate user's claimable toppings if wallet is connected
    let userToppings = 0;
    if (isConnected && connection?.address) {
      userToppings = getUserClaimableToppings(connection.address, isConnected);
    }

    // Check if toppings can be claimed and get time until next window
    const claimingAllowed = canClaimToppings();
    const timeUntilClaiming = getTimeUntilClaimingWindow();

    setCommunityJackpot(jackpot);
    setDailyPlayers(daily);
    setWeeklyPlayers(weekly);
    setToppingsAvailable(toppings);
    setTotalVMFInJackpot(vmfInJackpot);
    setUserClaimableToppings(userToppings);
    setCanClaim(claimingAllowed);
    setTimeUntilClaiming(timeUntilClaiming);
    setWeeklyInfo(info);
  };

  // Load data on mount and refresh periodically
  useEffect(() => {
    loadRealData();

    // Refresh every second for countdown and real-time updates
    const interval = setInterval(() => {
      loadRealData();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Automatic weekly winner selection when it's Monday 12pm PST
  useEffect(() => {
    // Check if it's time for weekly jackpot draw and draw hasn't been completed yet
    if (isWeeklyJackpotTime() && !isDrawComplete && totalVMFInJackpot > 0) {
      const performDraw = async () => {
        console.log("🏆 Time's up! Selecting jackpot winners...");

        // Select 10 random winners
        const selectedWinners = selectWeeklyJackpotWinners();
        setWinners(selectedWinners);
        setIsDrawComplete(true);

        if (selectedWinners.length > 0) {
          // Pay winners in VMF
          await payWeeklyJackpotWinners(selectedWinners, totalVMFInJackpot);

          console.log("✅ Weekly jackpot draw completed and winners paid!");
        } else {
          console.log("⚠️ No eligible players found for weekly jackpot draw");
        }
      };

      performDraw();
    }
  }, [weeklyInfo.timeUntilDraw, isDrawComplete, totalVMFInJackpot]);

  // Handle claiming toppings
  const handleClaimToppings = async () => {
    if (!isConnected || !connection?.address) {
      alert("Please connect your wallet to claim toppings!");
      return;
    }

    if (userClaimableToppings <= 0) {
      alert("You don't have any toppings to claim!");
      return;
    }

    if (!canClaim) {
      alert(
        "Toppings can only be claimed between Sunday 12pm PST and Monday 12pm PST!"
      );
      return;
    }

    try {
      // Simulate wallet transaction confirmation
      const confirmed = window.confirm(
        `Claim ${userClaimableToppings} toppings?\n\nThis will require a wallet transaction to confirm.`
      );

      if (confirmed) {
        // Simulate transaction processing
        console.log(
          `🏆 Claiming ${userClaimableToppings} toppings for ${connection.address}`
        );

        // In a real implementation, this would be a smart contract call
        // For now, we'll simulate the claim by updating localStorage
        const toppingsKey = `pizza_toppings_${connection.address.toLowerCase()}`;
        const currentToppings = Number.parseInt(
          localStorage.getItem(toppingsKey) || "0"
        );
        const newTotal = currentToppings + userClaimableToppings;

        localStorage.setItem(toppingsKey, newTotal.toString());

        // Clear the claimable toppings (they've been claimed)
        setUserClaimableToppings(0);

        // Refresh data
        loadRealData();

        alert(`✅ Successfully claimed ${userClaimableToppings} toppings!`);
      }
    } catch (error) {
      console.error("Error claiming toppings:", error);
      alert("Failed to claim toppings. Please try again.");
    }
  };

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="min-h-screen p-2"
      style={{
        backgroundImage: "url('/images/rotated-90-pizza-wallpaper.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center center",
      }}
    >
      <div className="max-w-md mx-auto">
        <Card className="relative bg-white/90 backdrop-blur-sm border-4 border-red-800 rounded-3xl shadow-2xl mb-6">
          <CardHeader className="text-center pb-1">
            <div className="absolute top-4 left-4 z-10">
              <Link href="/">
                <Button
                  variant="secondary"
                  size="icon"
                  className="!bg-white hover:!bg-gray-100 text-black border-2 border-gray-300 rounded-xl shadow-lg"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            </div>

            <CardTitle
              className="text-4xl text-red-800 mb-1"
              style={customFontStyle}
            >
              Weekly Jackpot
            </CardTitle>
            <p className="text-lg text-gray-700" style={customFontStyle}>
              Collect toppings to win!
            </p>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Jackpot Amount */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-3 rounded-xl border-4 border-yellow-600 text-center">
              <p className="text-white text-2xl mb-2" style={customFontStyle}>
                Weekly Jackpot
              </p>
              <p
                className="text-white text-4xl font-black flex items-center justify-center"
                style={customFontStyle}
              >
                <img
                  src="/images/star-favicon.png"
                  alt="Star"
                  className="w-8 h-8 rounded-full mx-2"
                />{" "}
                {Math.floor(totalVMFInJackpot)} VMF{" "}
                <img
                  src="/images/star-favicon.png"
                  alt="Star"
                  className="w-8 h-8 rounded-full mx-2"
                />
              </p>
            </div>

            {/* Claim Toppings Button */}
            <div className="text-center">
              <Button
                onClick={handleClaimToppings}
                disabled={
                  !isConnected || userClaimableToppings <= 0 || !canClaim
                }
                className={`w-full text-lg font-bold py-3 px-6 rounded-xl border-4 shadow-lg transform hover:scale-105 transition-all ${
                  isConnected && userClaimableToppings > 0 && canClaim
                    ? "!bg-green-600 hover:!bg-green-700 text-white border-green-800"
                    : "!bg-gray-400 text-gray-600 border-gray-500 cursor-not-allowed"
                }`}
                style={customFontStyle}
              >
                🍕 Claim {userClaimableToppings} Toppings 🍕
              </Button>
              {!isConnected && (
                <>
                  <p
                    className="text-xs text-gray-500 mt-2"
                    style={customFontStyle}
                  >
                    Connect wallet to claim your toppings
                  </p>
                  <p
                    className="text-xs text-gray-500 mt-1"
                    style={{ ...customFontStyle, fontSize: "12px" }}
                  >
                    Toppings can only be claimed between Sunday 12pm PST and
                    Monday 12pm PST
                  </p>
                </>
              )}
              {isConnected && (
                <p
                  className="text-xs text-gray-500 mt-2"
                  style={customFontStyle}
                >
                  Can claim Toppings only between 12pm PST Sunday- 12pm PST
                  Monday
                </p>
              )}
              {isConnected && userClaimableToppings === 0 && (
                <p
                  className="text-xs text-gray-500 mt-2"
                  style={customFontStyle}
                >
                  No toppings available to claim
                </p>
              )}
              {isConnected && userClaimableToppings > 0 && !canClaim && (
                <div
                  className="text-xs text-orange-600 mt-2"
                  style={customFontStyle}
                >
                  <p>⏰ Next claiming window in:</p>
                  <p>
                    {timeUntilClaiming.days}d {timeUntilClaiming.hours}h{" "}
                    {timeUntilClaiming.minutes}m {timeUntilClaiming.seconds}s
                  </p>
                </div>
              )}
            </div>

            {/* Countdown Timer or Winners Display */}
            {!isDrawComplete ? (
              <div className="bg-blue-50 p-4 rounded-xl border-2 border-blue-200">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <p
                    className="font-semibold text-blue-800 text-center"
                    style={customFontStyle}
                  >
                    Next Draw In:
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded">
                    <div
                      className="text-xl font-bold text-blue-800"
                      style={customFontStyle}
                    >
                      {weeklyInfo.timeUntilDraw.days}
                    </div>
                    <div
                      className="text-xs text-blue-600"
                      style={customFontStyle}
                    >
                      DAYS
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div
                      className="text-xl font-bold text-blue-800"
                      style={customFontStyle}
                    >
                      {weeklyInfo.timeUntilDraw.hours}
                    </div>
                    <div
                      className="text-xs text-blue-600"
                      style={customFontStyle}
                    >
                      HRS
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div
                      className="text-xl font-bold text-blue-800"
                      style={customFontStyle}
                    >
                      {weeklyInfo.timeUntilDraw.minutes}
                    </div>
                    <div
                      className="text-xs text-blue-600"
                      style={customFontStyle}
                    >
                      MIN
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <div
                      className="text-xl font-bold text-blue-800"
                      style={customFontStyle}
                    >
                      {weeklyInfo.timeUntilDraw.seconds}
                    </div>
                    <div
                      className="text-xs text-blue-600"
                      style={customFontStyle}
                    >
                      SEC
                    </div>
                  </div>
                </div>
                <p
                  className="text-xs text-blue-600 text-center mt-2"
                  style={customFontStyle}
                >
                  Draw happens every Sunday at 12pm PST
                </p>
              </div>
            ) : (
              <div className="bg-green-50 p-4 rounded-xl border-2 border-green-200">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Trophy className="h-5 w-5 text-green-600" />
                  <p
                    className="font-semibold text-green-800 text-center"
                    style={customFontStyle}
                  >
                    🏆 Jackpot Winners! 🏆
                  </p>
                </div>
                <div className="space-y-2">
                  {winners.map((winner, index) => (
                    <div
                      key={winner}
                      className="bg-white p-2 rounded border border-green-300"
                    >
                      <p
                        className="text-sm text-green-700 text-center"
                        style={customFontStyle}
                      >
                        <strong>Winner {index + 1}:</strong>{" "}
                        {winner.slice(0, 6)}...{winner.slice(-4)}
                      </p>
                      <p
                        className="text-xs text-green-600 text-center"
                        style={customFontStyle}
                      >
                        Paid: {Math.floor(totalVMFInJackpot / winners.length)}{" "}
                        VMF
                      </p>
                    </div>
                  ))}
                </div>
                <p
                  className="text-xs text-green-600 text-center mt-2"
                  style={customFontStyle}
                >
                  VMF automatically sent from contract:
                  0x2213414893259b0c48066acd1763e7fba97859e5
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex justify-center">
              <div className="bg-blue-800 rounded-xl text-center w-full h-10 flex items-center justify-center border-2 border-blue-700">
                <Users className="h-5 w-5 mr-2 text-white" />
                <p
                  className="text-base text-white mr-2"
                  style={customFontStyle}
                >
                  Weekly Players
                </p>
                <p
                  className="text-base font-bold text-white"
                  style={customFontStyle}
                >
                  {weeklyPlayers.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{ gap: "20px", display: "flex", flexDirection: "column" }}
            >
              <Link href="/game">
                <Button
                  className="w-full !bg-green-600 hover:!bg-green-700 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-green-800 shadow-lg transform hover:scale-105 transition-all"
                  style={{
                    ...customFontStyle,
                    letterSpacing: "1px",
                    fontSize: "1.25rem",
                  }}
                >
                  🍕 START PLAYING 🍕
                </Button>
              </Link>

              <Link href="/leaderboard">
                <Button
                  className="w-full !bg-green-600 hover:!bg-green-700 text-white text-lg font-bold py-3 px-6 rounded-xl border-4 border-green-800 shadow-lg transform hover:scale-105 transition-all"
                  style={{
                    ...customFontStyle,
                    letterSpacing: "1px",
                    fontSize: "1.25rem",
                  }}
                >
                  🏆 LEADERBOARD 🏆
                </Button>
              </Link>
            </div>

            {/* How It Works */}
            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
              <h3
                className="text-lg font-bold text-gray-800 mb-3 text-center"
                style={customFontStyle}
              >
                🍕 How to Win Toppings 🍕
              </h3>
              <ul
                className="space-y-2 text-sm text-gray-700"
                style={customFontStyle}
              >
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Play Daily:</strong> 1 topping each day played
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Refer new players:</strong> 2 toppings per referral
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Hold VMF tokens:</strong> 3 toppings for every 10
                    VMF in wallet
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>More toppings = higher chance to win!</span>
                </li>
              </ul>
            </div>

            {/* Terms */}
            <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
              <h3
                className="text-lg font-bold text-yellow-800 mb-3 text-center"
                style={customFontStyle}
              >
                📋 Terms
              </h3>
              <ul
                className="space-y-1 text-xs text-yellow-700"
                style={customFontStyle}
              >
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Daily Game Rules:</strong> One entry per wallet per
                    day. Each 24-hour game window starts at 12pm PST.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Daily Chances:</strong> Every wallet that enters has
                    exactly the same chance to win, regardless of VMF holdings.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Prerequisite to qualify:</strong> Must hold minimum
                    VMF tokens to participate
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>All winners split the jackpot:</strong> Prize pool
                    divided equally among winners
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Daily Jackpot:</strong> 8 winners randomly selected
                    from today's players at 12pm PST daily. VMF automatically
                    paid from contract
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Weekly Jackpot:</strong> 10 winners randomly
                    selected with weighted probability based on toppings at
                    Monday 12pm PST. VMF automatically paid from contract
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Toppings expire & refresh weekly:</strong> Use them
                    or lose them each week
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Topping Claiming Window:</strong> Toppings can only
                    be claimed between Sunday 12pm PST (when claiming opens) and
                    Monday 12pm PST (when weekly game ends)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>Weekly Jackpot:</strong> Must claim toppings before
                    Monday's 12pm PST to be in the drawing
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <img
                    src="/images/pepperoni-art.png"
                    alt="Pepperoni"
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                  />
                  <span>
                    <strong>
                      Weekly jackpot equals total toppings claimed, paid in VMF:
                    </strong>{" "}
                    1 topping = 1 VMF in prize pool
                  </span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
