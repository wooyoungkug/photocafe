'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, RotateCcw, Info } from 'lucide-react';
import { getRandomCard, type TarotCard } from '@/lib/tarot-cards';
import { motion, AnimatePresence } from 'framer-motion';

type DrawnCard = TarotCard & { isReversed: boolean };

export default function TarotPage() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnCard, setDrawnCard] = useState<DrawnCard | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  const handleDrawCard = () => {
    setIsDrawing(true);
    setShowIntro(false);

    // 카드 뽑기 애니메이션 시간
    setTimeout(() => {
      const card = getRandomCard();
      setDrawnCard(card);
      setIsDrawing(false);
    }, 1500);
  };

  const handleReset = () => {
    setDrawnCard(null);
    setShowIntro(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="h-8 w-8 text-yellow-400" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              오늘의 타로점
            </h1>
            <Sparkles className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-purple-200 text-lg">
            타로 카드가 전하는 오늘의 메시지를 받아보세요
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {showIntro && !drawnCard && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <Card className="bg-white/10 backdrop-blur-lg border-purple-300/20">
                  <CardContent className="p-8 md:p-12">
                    <div className="text-6xl mb-6">🔮</div>
                    <h2 className="text-2xl font-bold text-white mb-4">
                      마음을 가다듬고
                    </h2>
                    <p className="text-purple-200 mb-8 leading-relaxed">
                      깊게 숨을 들이마시고, 오늘 하루에 대한 질문이나<br />
                      마음속 고민을 떠올려보세요.<br />
                      타로 카드가 당신에게 필요한 메시지를 전해줄 것입니다.
                    </p>
                    <Button
                      size="lg"
                      onClick={handleDrawCard}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-6 text-lg"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      카드 뽑기
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {isDrawing && (
              <motion.div
                key="drawing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center"
              >
                <Card className="bg-white/10 backdrop-blur-lg border-purple-300/20">
                  <CardContent className="p-12">
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="text-8xl mb-4"
                    >
                      🃏
                    </motion.div>
                    <p className="text-white text-xl font-semibold">
                      카드를 뽑고 있습니다...
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {drawnCard && !isDrawing && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white/10 backdrop-blur-lg border-purple-300/20 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-purple-300/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-2xl">
                        당신의 카드
                      </CardTitle>
                      {drawnCard.isReversed && (
                        <Badge variant="outline" className="border-pink-300 text-pink-200">
                          역방향
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    {/* Card Display */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-center mb-8"
                    >
                      <div className={`text-9xl mb-4 inline-block ${drawnCard.isReversed ? 'rotate-180' : ''}`}>
                        {drawnCard.emoji}
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-2">
                        {drawnCard.name}
                      </h2>
                      <p className="text-purple-200 text-lg">
                        {drawnCard.nameEn}
                      </p>
                    </motion.div>

                    {/* Interpretation */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-6"
                    >
                      {/* Description */}
                      <div className="bg-white/5 rounded-lg p-6 border border-purple-300/20">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-purple-300 mt-1 flex-shrink-0" />
                          <div>
                            <h3 className="text-white font-semibold mb-2">카드 설명</h3>
                            <p className="text-purple-200 leading-relaxed">
                              {drawnCard.description}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Meaning */}
                      <div className="bg-white/5 rounded-lg p-6 border border-purple-300/20">
                        <h3 className="text-white font-semibold mb-3">
                          {drawnCard.isReversed ? '역방향 해석' : '정방향 해석'}
                        </h3>
                        <p className="text-purple-200 leading-relaxed text-lg">
                          {drawnCard.isReversed ? drawnCard.reversed : drawnCard.upright}
                        </p>
                      </div>

                      {/* Keywords */}
                      <div className="bg-white/5 rounded-lg p-6 border border-purple-300/20">
                        <h3 className="text-white font-semibold mb-3">키워드</h3>
                        <div className="flex flex-wrap gap-2">
                          {drawnCard.keywords.map((keyword, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="bg-purple-500/30 text-purple-100 border-purple-300/30"
                            >
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="mt-8 text-center"
                    >
                      <Button
                        onClick={handleReset}
                        size="lg"
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                      >
                        <RotateCcw className="mr-2 h-5 w-5" />
                        다시 뽑기
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>

                {/* Additional Info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 text-center text-purple-200 text-sm"
                >
                  <p>
                    💡 타로는 참고용입니다. 긍정적인 마음으로 해석하세요.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center"
        >
          <Card className="bg-white/5 backdrop-blur-sm border-purple-300/10 max-w-2xl mx-auto">
            <CardContent className="p-6">
              <h3 className="text-white font-semibold mb-3">타로점이란?</h3>
              <p className="text-purple-200 text-sm leading-relaxed">
                타로는 78장의 카드를 사용하는 점술 방법입니다.
                메이저 아르카나 22장은 인생의 중요한 전환점과 깊은 의미를 담고 있으며,
                카드의 상징과 직관을 통해 현재 상황에 대한 통찰을 얻을 수 있습니다.
                타로는 미래를 예언하기보다는 현재를 돌아보고 더 나은 선택을 하도록 돕는 도구입니다.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
