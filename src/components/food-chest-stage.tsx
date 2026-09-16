"use client";

import {
  ArrowLeft,
  Check,
  PackageOpen,
  RotateCw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { commitFoodRoll, rollFoodForSlot } from "@/actions/plans";
import type { FoodSpinResultDTO, SpinFoodDTO, SpinTarget } from "@/lib/dto";
import { CHEST_SETTLE_MS } from "@/lib/food-chest-motion";
import { useFoodChestAudio } from "@/lib/use-food-chest-audio";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FoodChestArtwork } from "@/components/food-chest-artwork";
import { chestAccent, FoodChestReel } from "@/components/food-chest-reel";

type ChestStage =
  "ready" | "loading" | "rolling" | "settling" | "result" | "saving";

export function FoodChestStage({
  target,
  period,
  previewFoods,
  onBack,
  onCommitted,
}: {
  target: SpinTarget;
  period: "LUNCH" | "DINNER";
  previewFoods: SpinFoodDTO[];
  onBack: () => void;
  onCommitted: () => void;
}) {
  const [stage, setStage] = useState<ChestStage>("ready");
  const [result, setResult] = useState<FoodSpinResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("Hòm đang chờ được mở");
  const [pending, startTransition] = useTransition();
  const resultRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const { enabled, play, playReward, prepareReward, stopAll, toggle } =
    useFoodChestAudio();
  const showingResult = stage === "result" || stage === "saving";
  const spinning = stage === "rolling";
  const busy =
    pending ||
    stage === "loading" ||
    spinning ||
    stage === "settling" ||
    stage === "saving";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  const tick = useCallback(() => play("tick"), [play]);
  const finishReel = useCallback(() => setStage("settling"), []);

  useEffect(() => {
    if (stage !== "settling" || !result) return;
    stopAll();
    playReward(result.label);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : CHEST_SETTLE_MS;
    const timer = window.setTimeout(() => {
      setStage("result");
      setAnnouncement(`Đã quay xong: ${result.selected.name}`);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [playReward, result, stage, stopAll]);

  useEffect(() => {
    if (showingResult) resultRef.current?.focus({ preventScroll: true });
  }, [showingResult]);

  const startRoll = () => {
    if (busy) return;
    const request = ++requestRef.current;
    stopAll();
    play("click");
    setStage("loading");
    setError(null);
    setAnnouncement("Đang chuẩn bị lượt quay");
    startTransition(async () => {
      try {
        const response = await rollFoodForSlot(target);
        if (!mountedRef.current || request !== requestRef.current) return;
        if (response.error || !response.result) {
          const message = response.error ?? "Không mở được hòm món";
          setError(message);
          setAnnouncement(message);
          setStage(result ? "result" : "ready");
          return;
        }
        prepareReward(response.result.label);
        stopAll();
        play("open");
        setResult(response.result);
        setStage("rolling");
        setAnnouncement("Đang quay, chờ món dừng ở giữa");
      } catch {
        if (!mountedRef.current || request !== requestRef.current) return;
        const message = "Không mở được hòm món — kiểm tra mạng rồi thử lại nhé";
        setError(message);
        setAnnouncement(message);
        setStage(result ? "result" : "ready");
      }
    });
  };

  const commit = () => {
    if (!result || busy) return;
    stopAll();
    setStage("saving");
    setError(null);
    setAnnouncement("Đang lưu món vào bữa");
    startTransition(async () => {
      try {
        const response = await commitFoodRoll(target, result.selected.id);
        if (!mountedRef.current) return;
        if (response.error) {
          setError(response.error);
          setAnnouncement(response.error);
          setStage("result");
          return;
        }
        toast.success(`Đã gắn “${result.selected.name}” vào bữa`);
        onCommitted();
      } catch {
        if (!mountedRef.current) return;
        const message = "Không lưu được món — kiểm tra mạng rồi thử lại nhé";
        setError(message);
        setAnnouncement(message);
        setStage("result");
      }
    });
  };

  const leaveChest = () => {
    if (stage === "saving") return;
    requestRef.current += 1;
    stopAll();
    onBack();
  };

  return (
    <div className="food-chest-shell" aria-busy={busy}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-chest-gold uppercase">
            Bộ sưu tập món ngon
          </p>
          <p className="mt-1 text-sm text-chest-muted">
            {target.position === "MAIN" ? "Món chính" : "Món phụ"} ·{" "}
            {period === "LUNCH" ? "Bữa trưa" : "Bữa tối"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="food-chest-icon-button"
            aria-label={enabled ? "Tắt âm thanh" : "Bật âm thanh"}
            aria-pressed={enabled}
            onClick={toggle}
          >
            {enabled ? <Volume2 /> : <VolumeX />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="food-chest-icon-button"
            aria-label="Quay lại đổi món"
            onClick={leaveChest}
            disabled={stage === "saving"}
          >
            <ArrowLeft />
          </Button>
        </div>
      </div>

      <div className="food-chest-stage" data-state={stage}>
        <div
          className="food-chest-stage-backdrop"
          inert={showingResult}
          aria-hidden={showingResult}
        >
          <div className="food-chest-reel-heading">
            <span>HÒM MÓN ĂN</span>
            <span>
              {spinning || stage === "settling"
                ? "ĐANG MỞ KHÓA"
                : "KHÁM PHÁ HƯƠNG VỊ"}
            </span>
          </div>
          <FoodChestReel
            result={result}
            previewFoods={previewFoods}
            spinning={spinning}
            onTick={tick}
            onComplete={finishReel}
          />
          <div className="food-chest-console">
            <div className="food-chest-status">
              <h3>
                {spinning
                  ? "Món ngon nào đang chờ bạn?"
                  : stage === "settling"
                    ? "Đã tìm thấy món của bạn"
                    : "Hôm nay, thử một điều bất ngờ"}
              </h3>
              <p>
                {spinning
                  ? "Chờ thẻ món dừng ở vạch vàng."
                  : "Mở hòm và chọn món cho bữa ăn của cả nhà."}
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="food-chest-cta h-12 w-full max-w-sm rounded-sm text-sm font-bold tracking-[0.1em] uppercase"
              disabled={busy}
              onClick={startRoll}
            >
              {stage === "loading" ? <Spinner /> : <PackageOpen />}
              {stage === "loading"
                ? "Đang chuẩn bị…"
                : spinning || stage === "settling"
                  ? "Đang mở khóa…"
                  : result
                    ? "Khai mở lần nữa"
                    : "Khai mở hòm món"}
            </Button>
            <div className="food-chest-labels">
              <span>Đổi vị</span>
              <span>Hợp gu</span>
              <span>Món tủ</span>
            </div>
            <p className="text-xs text-chest-muted">
              Món chỉ được thêm vào lịch khi bạn xác nhận.
            </p>
          </div>
        </div>

        {showingResult && result ? (
          <div className="food-chest-result-overlay">
            <div
              className="food-chest-result"
              style={
                {
                  "--dish-accent": chestAccent(result.selected.favoriteScore),
                } as CSSProperties
              }
            >
              <div className="food-chest-result-label">
                <Sparkles className="size-3.5" />
                {result.label} · Đã khai mở
              </div>
              <h3
                ref={resultRef}
                tabIndex={-1}
                className="food-chest-result-title"
              >
                {result.selected.name}
              </h3>
              <p className="text-sm text-chest-muted">
                {result.selected.cookingMethod}
              </p>
              <FoodChestArtwork
                name={result.selected.name}
                method={result.selected.cookingMethod}
              />
              <p className="text-xs text-chest-muted">
                {result.selected.totalCooked
                  ? `Đã nấu ${result.selected.totalCooked} lần`
                  : "Một hương vị mới cho cả nhà"}
              </p>
              <div className="food-chest-result-actions mt-4 grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="food-chest-secondary h-11 rounded-sm"
                  onClick={startRoll}
                  disabled={busy}
                >
                  <RotateCw />
                  Quay lần nữa
                </Button>
                <Button
                  type="button"
                  className="food-chest-cta h-11 rounded-sm"
                  onClick={commit}
                  disabled={busy}
                >
                  {stage === "saving" ? <Spinner /> : <Check />}
                  {stage === "saving" ? "Đang lưu…" : "Dùng món này"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-center text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
