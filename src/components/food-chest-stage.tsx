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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { toast } from "sonner";
import { commitFoodRoll, rollFoodForSlot } from "@/actions/plans";
import type { FoodSpinResultDTO, SpinFoodDTO, SpinTarget } from "@/lib/dto";
import {
  CHEST_SETTLE_MS,
  CHEST_SPIN_MS,
  chestSpinDuration,
} from "@/lib/food-chest-motion";
import { useFoodChestAudio } from "@/lib/use-food-chest-audio";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FoodChestArtwork } from "@/components/food-chest-artwork";
import { chestAccent, FoodChestReel } from "@/components/food-chest-reel";

type ChestStage =
  "ready" | "loading" | "rolling" | "settling" | "result" | "saving";

const CHARGE_MAX_MS = 1600;

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
  const [rolledFoodIds, setRolledFoodIds] = useState<string[]>([]);
  const [charge, setCharge] = useState(0);
  const [spinDuration, setSpinDuration] = useState(CHEST_SPIN_MS);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);
  const chargingRef = useRef(false);
  const chargeRef = useRef(0);
  const chargeStartedAtRef = useRef<number | null>(null);
  const chargeFrameRef = useRef<number | null>(null);
  const { enabled, play, playReward, prepareReward, stopAll, toggle } =
    useFoodChestAudio();
  const showingResult = stage === "result" || stage === "saving";
  const spinning = stage === "rolling";
  const chargePercent = Math.round(charge * 100);
  const fullyCharged = charge >= 0.99;
  const busy =
    pending ||
    stage === "loading" ||
    spinning ||
    stage === "settling" ||
    stage === "saving";
  const rollTarget = useMemo<SpinTarget>(
    () => ({ ...target, avoidFoodIds: rolledFoodIds }),
    [rolledFoodIds, target]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      if (chargeFrameRef.current !== null) {
        cancelAnimationFrame(chargeFrameRef.current);
      }
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

  const startRoll = (chargePower = 0) => {
    if (busy) return;
    const request = ++requestRef.current;
    setSpinDuration(chestSpinDuration(chargePower));
    stopAll();
    play("click");
    setStage("loading");
    setError(null);
    setAnnouncement("Đang chuẩn bị lượt quay");
    startTransition(async () => {
      try {
        const response = await rollFoodForSlot(rollTarget);
        if (!mountedRef.current || request !== requestRef.current) return;
        if (response.error || !response.result) {
          const message = response.error ?? "Không mở được hòm món";
          setError(message);
          setAnnouncement(message);
          setStage(result ? "result" : "ready");
          return;
        }
        prepareReward(response.result.label);
        setRolledFoodIds((previous) =>
          previous.includes(response.result!.selected.id)
            ? previous
            : [...previous, response.result!.selected.id]
        );
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

  const beginCharge = () => {
    if (busy || chargingRef.current) return;
    chargingRef.current = true;
    chargeStartedAtRef.current = performance.now();
    chargeRef.current = 0;
    setCharge(0);
    setAnnouncement("Đang tích lực — thả tay để khai mở");

    const animateCharge = (now: number) => {
      if (!chargingRef.current || chargeStartedAtRef.current === null) return;
      const next = Math.min(
        1,
        (now - chargeStartedAtRef.current) / CHARGE_MAX_MS
      );
      chargeRef.current = next;
      setCharge(next);
      if (next < 1) {
        chargeFrameRef.current = requestAnimationFrame(animateCharge);
      } else {
        chargeFrameRef.current = null;
      }
    };

    chargeFrameRef.current = requestAnimationFrame(animateCharge);
  };

  const finishCharge = () => {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    if (chargeFrameRef.current !== null) {
      cancelAnimationFrame(chargeFrameRef.current);
      chargeFrameRef.current = null;
    }
    const power = chargeRef.current;
    chargeStartedAtRef.current = null;
    chargeRef.current = 0;
    setCharge(0);
    startRoll(power);
  };

  const cancelCharge = () => {
    if (!chargingRef.current) return;
    chargingRef.current = false;
    if (chargeFrameRef.current !== null) {
      cancelAnimationFrame(chargeFrameRef.current);
      chargeFrameRef.current = null;
    }
    chargeStartedAtRef.current = null;
    chargeRef.current = 0;
    setCharge(0);
    setAnnouncement("Đã hủy tích lực");
  };

  const beginPointerCharge = (event: PointerEvent<HTMLButtonElement>) => {
    if (busy) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    beginCharge();
  };

  const finishPointerCharge = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishCharge();
  };

  const beginKeyboardCharge = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    beginCharge();
  };

  const finishKeyboardCharge = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    finishCharge();
  };

  const returnToReady = () => {
    if (busy) return;
    requestRef.current += 1;
    stopAll();
    if (chargeFrameRef.current !== null) {
      cancelAnimationFrame(chargeFrameRef.current);
      chargeFrameRef.current = null;
    }
    chargeStartedAtRef.current = null;
    chargeRef.current = 0;
    setCharge(0);
    setSpinDuration(CHEST_SPIN_MS);
    setResult(null);
    setError(null);
    setStage("ready");
    setAnnouncement("Sẵn sàng — nhấn giữ để quay lượt tiếp theo");
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
            spinDuration={spinDuration}
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
                    : fullyCharged
                      ? "ĐÃ TÍCH ĐẦY — THẢ TAY!"
                      : charge > 0
                        ? "Đang tích lực khai mở"
                        : "Hôm nay, thử một điều bất ngờ"}
              </h3>
              <p>
                {spinning
                  ? "Chờ thẻ món dừng ở vạch vàng."
                  : fullyCharged
                    ? "FULL CHARGE · Reel sẽ quay lâu nhất."
                    : charge > 0
                      ? `Tích lực ${chargePercent}% — thả tay để quay lâu hơn.`
                      : "Nhấn giữ để tích lực, rồi thả tay để khai mở hòm."}
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              className="food-chest-cta h-12 w-full max-w-sm rounded-sm text-sm font-bold tracking-[0.1em] uppercase"
              disabled={busy}
              data-charging={charge > 0}
              data-full-charge={fullyCharged}
              onPointerDown={beginPointerCharge}
              onPointerUp={finishPointerCharge}
              onPointerCancel={cancelCharge}
              onKeyDown={beginKeyboardCharge}
              onKeyUp={finishKeyboardCharge}
              onContextMenu={(event) => event.preventDefault()}
              aria-describedby="food-chest-charge-help"
              aria-label={
                fullyCharged
                  ? "Đã tích đầy lực, thả tay để khai mở"
                  : "Nhấn giữ để tích lực khai mở hòm món"
              }
            >
              <span
                className="food-chest-charge-fill"
                style={{ width: `${charge * 100}%` }}
                aria-hidden="true"
              />
              <span className="food-chest-cta-content">
                {stage === "loading" ? <Spinner /> : <PackageOpen />}
                {stage === "loading"
                  ? "Đang chuẩn bị…"
                  : spinning || stage === "settling"
                    ? "Đang mở khóa…"
                    : result
                      ? "Khai mở lần nữa"
                      : "Khai mở hòm món"}
              </span>
              {charge > 0 ? (
                <span className="food-chest-charge-badge" aria-hidden="true">
                  {fullyCharged ? "FULL CHARGE" : `${chargePercent}%`}
                </span>
              ) : null}
            </Button>
            <span id="food-chest-charge-help" className="sr-only">
              Nhấn giữ nút để tích lực từ 0 đến 100 phần trăm. Thả nút để bắt
              đầu quay; tích lực càng đầy, reel quay càng lâu.
            </span>
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
                  onClick={returnToReady}
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
