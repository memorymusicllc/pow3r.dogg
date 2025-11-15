/**
 * Behavioral Analytics (Undetectable)
 * 
 * Captures behavioral biometrics without alerting the user:
 * - Keystroke dynamics
 * - Mouse movement profiling
 * - Scroll pattern analysis
 * - Focus/blur event correlation
 * - Micro-interaction timing
 */

export interface KeystrokeEvent {
  key: string;
  timestamp: number;
  keyDown: number;
  keyUp: number;
  duration: number;
}

export interface MouseEvent {
  x: number;
  y: number;
  timestamp: number;
  movementX: number;
  movementY: number;
  buttons: number;
}

export interface ScrollEvent {
  scrollX: number;
  scrollY: number;
  timestamp: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
}

export interface BehavioralProfile {
  keystrokePatterns: {
    averageDuration: number;
    variance: number;
    commonPairs: Map<string, number>;
    rhythm: number[];
  };
  mousePatterns: {
    averageSpeed: number;
    acceleration: number[];
    clickPatterns: number[];
    movementSmoothness: number;
  };
  scrollPatterns: {
    averageVelocity: number;
    scrollFrequency: number;
    directionChanges: number;
  };
  attentionPatterns: {
    focusDuration: number[];
    blurFrequency: number;
    tabSwitches: number;
  };
  microInteractions: {
    clickToHover: number[];
    hoverToClick: number[];
    formFillSpeed: number;
  };
}

export class BehavioralAnalytics {
  private keystrokeEvents: KeystrokeEvent[] = [];
  private mouseEvents: MouseEvent[] = [];
  private scrollEvents: ScrollEvent[] = [];
  private focusEvents: { timestamp: number; type: 'focus' | 'blur' }[] = [];
  private interactionEvents: { type: string; timestamp: number; data: unknown }[] = [];

  /**
   * Capture keystroke dynamics
   */
  captureKeystroke(key: string, keyDown: number, keyUp: number): void {
    const event: KeystrokeEvent = {
      key,
      timestamp: Date.now(),
      keyDown,
      keyUp,
      duration: keyUp - keyDown,
    };

    this.keystrokeEvents.push(event);

    // Keep only last 1000 events to prevent memory issues
    if (this.keystrokeEvents.length > 1000) {
      this.keystrokeEvents.shift();
    }
  }

  /**
   * Capture mouse movement
   */
  captureMouseMovement(x: number, y: number, movementX: number, movementY: number, buttons: number): void {
    const event: MouseEvent = {
      x,
      y,
      timestamp: Date.now(),
      movementX,
      movementY,
      buttons,
    };

    this.mouseEvents.push(event);

    // Keep only last 500 events
    if (this.mouseEvents.length > 500) {
      this.mouseEvents.shift();
    }
  }

  /**
   * Capture scroll patterns
   */
  captureScroll(scrollX: number, scrollY: number, deltaX: number, deltaY: number): void {
    const now = Date.now();
    const lastScroll = this.scrollEvents[this.scrollEvents.length - 1];
    const timeDelta = lastScroll ? now - lastScroll.timestamp : 0;
    const velocity = timeDelta > 0 ? Math.sqrt(deltaX ** 2 + deltaY ** 2) / timeDelta : 0;

    const event: ScrollEvent = {
      scrollX,
      scrollY,
      timestamp: now,
      deltaX,
      deltaY,
      velocity,
    };

    this.scrollEvents.push(event);

    // Keep only last 200 events
    if (this.scrollEvents.length > 200) {
      this.scrollEvents.shift();
    }
  }

  /**
   * Capture focus/blur events
   */
  captureFocus(type: 'focus' | 'blur'): void {
    this.focusEvents.push({
      timestamp: Date.now(),
      type,
    });

    // Keep only last 100 events
    if (this.focusEvents.length > 100) {
      this.focusEvents.shift();
    }
  }

  /**
   * Capture micro-interactions
   */
  captureInteraction(type: string, data: unknown): void {
    this.interactionEvents.push({
      type,
      timestamp: Date.now(),
      data,
    });

    // Keep only last 500 events
    if (this.interactionEvents.length > 500) {
      this.interactionEvents.shift();
    }
  }

  /**
   * Generate behavioral profile
   */
  generateProfile(): BehavioralProfile {
    return {
      keystrokePatterns: this.analyzeKeystrokes(),
      mousePatterns: this.analyzeMouse(),
      scrollPatterns: this.analyzeScroll(),
      attentionPatterns: this.analyzeAttention(),
      microInteractions: this.analyzeMicroInteractions(),
    };
  }

  /**
   * Analyze keystroke patterns
   */
  private analyzeKeystrokes() {
    if (this.keystrokeEvents.length === 0) {
      return {
        averageDuration: 0,
        variance: 0,
        commonPairs: new Map(),
        rhythm: [],
      };
    }

    const durations = this.keystrokeEvents.map((e) => e.duration);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance =
      durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / durations.length;

    // Calculate common key pairs
    const pairs = new Map<string, number>();
    for (let i = 1; i < this.keystrokeEvents.length; i++) {
      const pair = `${this.keystrokeEvents[i - 1].key}-${this.keystrokeEvents[i].key}`;
      pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }

    // Calculate rhythm (time between keystrokes)
    const rhythm: number[] = [];
    for (let i = 1; i < this.keystrokeEvents.length; i++) {
      rhythm.push(this.keystrokeEvents[i].timestamp - this.keystrokeEvents[i - 1].timestamp);
    }

    return {
      averageDuration,
      variance,
      commonPairs: pairs,
      rhythm,
    };
  }

  /**
   * Analyze mouse patterns
   */
  private analyzeMouse() {
    if (this.mouseEvents.length === 0) {
      return {
        averageSpeed: 0,
        acceleration: [],
        clickPatterns: [],
        movementSmoothness: 0,
      };
    }

    // Calculate speeds
    const speeds: number[] = [];
    for (let i = 1; i < this.mouseEvents.length; i++) {
      const timeDelta = this.mouseEvents[i].timestamp - this.mouseEvents[i - 1].timestamp;
      if (timeDelta > 0) {
        const distance = Math.sqrt(
          this.mouseEvents[i].movementX ** 2 + this.mouseEvents[i].movementY ** 2
        );
        speeds.push(distance / timeDelta);
      }
    }

    const averageSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

    // Calculate acceleration (change in speed)
    const acceleration: number[] = [];
    for (let i = 1; i < speeds.length; i++) {
      acceleration.push(speeds[i] - speeds[i - 1]);
    }

    // Click patterns (timestamps of button presses)
    const clickPatterns = this.mouseEvents
      .filter((e) => e.buttons > 0)
      .map((e) => e.timestamp);

    // Movement smoothness (lower variance = smoother)
    const movementVariances = speeds.map((s) => Math.pow(s - averageSpeed, 2));
    const movementSmoothness = 1 / (1 + movementVariances.reduce((a, b) => a + b, 0) / speeds.length);

    return {
      averageSpeed,
      acceleration,
      clickPatterns,
      movementSmoothness,
    };
  }

  /**
   * Analyze scroll patterns
   */
  private analyzeScroll() {
    if (this.scrollEvents.length === 0) {
      return {
        averageVelocity: 0,
        scrollFrequency: 0,
        directionChanges: 0,
      };
    }

    const velocities = this.scrollEvents.map((e) => e.velocity);
    const averageVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;

    // Calculate scroll frequency (events per second)
    const timeSpan =
      this.scrollEvents[this.scrollEvents.length - 1].timestamp - this.scrollEvents[0].timestamp;
    const scrollFrequency = timeSpan > 0 ? (this.scrollEvents.length / timeSpan) * 1000 : 0;

    // Count direction changes
    let directionChanges = 0;
    for (let i = 1; i < this.scrollEvents.length; i++) {
      const prevDelta = this.scrollEvents[i - 1].deltaY;
      const currDelta = this.scrollEvents[i].deltaY;
      if ((prevDelta > 0 && currDelta < 0) || (prevDelta < 0 && currDelta > 0)) {
        directionChanges++;
      }
    }

    return {
      averageVelocity,
      scrollFrequency,
      directionChanges,
    };
  }

  /**
   * Analyze attention patterns
   */
  private analyzeAttention() {
    if (this.focusEvents.length === 0) {
      return {
        focusDuration: [],
        blurFrequency: 0,
        tabSwitches: 0,
      };
    }

    const focusDuration: number[] = [];
    let blurFrequency = 0;
    let tabSwitches = 0;

    for (let i = 0; i < this.focusEvents.length; i++) {
      if (this.focusEvents[i].type === 'blur') {
        blurFrequency++;
        if (i > 0 && this.focusEvents[i - 1].type === 'focus') {
          const duration = this.focusEvents[i].timestamp - this.focusEvents[i - 1].timestamp;
          focusDuration.push(duration);
          tabSwitches++;
        }
      }
    }

    return {
      focusDuration,
      blurFrequency,
      tabSwitches,
    };
  }

  /**
   * Analyze micro-interactions
   */
  private analyzeMicroInteractions() {
    const clickToHover: number[] = [];
    const hoverToClick: number[] = [];
    const formFillEvents = this.interactionEvents.filter((e) => e.type === 'form_fill');

    // Analyze interaction timing
    for (let i = 1; i < this.interactionEvents.length; i++) {
      const prev = this.interactionEvents[i - 1];
      const curr = this.interactionEvents[i];

      if (prev.type === 'click' && curr.type === 'hover') {
        clickToHover.push(curr.timestamp - prev.timestamp);
      }

      if (prev.type === 'hover' && curr.type === 'click') {
        hoverToClick.push(curr.timestamp - prev.timestamp);
      }
    }

    // Calculate form fill speed (characters per second)
    let formFillSpeed = 0;
    if (formFillEvents.length > 1) {
      const timeSpan =
        formFillEvents[formFillEvents.length - 1].timestamp - formFillEvents[0].timestamp;
      const totalChars = formFillEvents.reduce(
        (sum, e) => sum + ((e.data as { length?: number }).length || 0),
        0
      );
      formFillSpeed = timeSpan > 0 ? (totalChars / timeSpan) * 1000 : 0;
    }

    return {
      clickToHover,
      hoverToClick,
      formFillSpeed,
    };
  }

  /**
   * Detect anomalies in behavioral profile
   */
  detectAnomalies(profile: BehavioralProfile, baseline?: BehavioralProfile): {
    isAnomalous: boolean;
    confidence: number;
    reasons: string[];
  } {
    if (!baseline) {
      return { isAnomalous: false, confidence: 0, reasons: [] };
    }

    const reasons: string[] = [];
    let anomalyScore = 0;

    // Keystroke anomalies
    const keystrokeDiff = Math.abs(
      profile.keystrokePatterns.averageDuration - baseline.keystrokePatterns.averageDuration
    );
    if (keystrokeDiff > baseline.keystrokePatterns.averageDuration * 0.3) {
      reasons.push('Unusual keystroke timing');
      anomalyScore += 0.3;
    }

    // Mouse movement anomalies
    const mouseSpeedDiff = Math.abs(
      profile.mousePatterns.averageSpeed - baseline.mousePatterns.averageSpeed
    );
    if (mouseSpeedDiff > baseline.mousePatterns.averageSpeed * 0.5) {
      reasons.push('Unusual mouse movement speed');
      anomalyScore += 0.2;
    }

    // Scroll pattern anomalies
    if (profile.scrollPatterns.directionChanges < baseline.scrollPatterns.directionChanges * 0.3) {
      reasons.push('Bot-like scroll pattern (too linear)');
      anomalyScore += 0.3;
    }

    // Attention pattern anomalies
    if (profile.attentionPatterns.tabSwitches > baseline.attentionPatterns.tabSwitches * 2) {
      reasons.push('Excessive tab switching');
      anomalyScore += 0.2;
    }

    return {
      isAnomalous: anomalyScore > 0.5,
      confidence: Math.min(anomalyScore, 1.0),
      reasons,
    };
  }
}

