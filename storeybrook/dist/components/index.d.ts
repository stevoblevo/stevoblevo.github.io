/* Storeybrook 1.1 — types as documentation. Components are HTML + bundle.css classes (prefixed sb-); behaviors are
   window.Storeybrook. Each <Comp>Props names the markup contract a page provides; the functions are the JS API. */

export type LookId = 'daylight' | 'knight' | 'inkblot' | 'comix' | 'origami' | 'skein';
export type Density = 'regular' | 'kid' | 'tv';
export type Tag = 'sun' | 'rose' | 'lilac' | 'sea' | 'sky';
export type StoneState = 'open' | 'current' | 'done' | 'locked';
export type CreatureForm = 'saelion' | 'bunny' | 'octopus' | 'pixie';
export type CreatureStage = 0 | 1 | 2 | 3 | 4; /* egg, kit, bun, sprite, saelion */
export type CreatureMood = 'happy' | 'sleepy' | 'surprised';
export type CreatureHide = 'plain' | 'chimera'; /* chimera: the two-toned coat with drifting patches, on paper looks */
export type PaperSound = 'stone' | 'nougat' | 'sticker' | 'page';
export type IconName = 'play' | 'pause' | 'stop' | 'voice' | 'book' | 'next' | 'prev' | 'up' | 'down' | 'close' | 'menu' | 'home' | 'lock' | 'key' | 'check' | 'star' | 'sparkle' | 'nougat' | 'jar' | 'sticker' | 'stone' | 'brook' | 'sun' | 'moon' | 'ink' | 'comix' | 'origami' | 'skein' | 'gamepad' | 'tv' | 'tap' | 'drag' | 'hum' | 'heart' | 'map' | 'gift' | 'leaf' | 'eye' | 'info' | 'alert' | 'music' | 'egg' | 'bunny' | 'look';

/** Actions */
export interface ButtonProps { variant: 'primary' | 'secondary' | 'quiet' | 'sticker'; size?: 'md' | 'lg' | 'sm' | 'icon'; label: string; icon?: IconName; disabled?: boolean; busy?: boolean; href?: string }
export interface SealProps { label: string; letter?: string; icon?: IconName; size?: 'sm' | 'md' | 'lg' }

/** Inputs */
export interface ChoiceProps { legend: string; name: string; options: { label: string; value: string; checked?: boolean }[] }
export interface ToggleProps { label: string; checked?: boolean; disabled?: boolean }
export interface SliderProps { label: string; min: number; max: number; value: number; step?: number; output?: string }
export interface LooksProps { looks: { id: LookId; name: string; line: string; paper: string; a: string; b: string; ink: string; font: string; locked?: boolean; why?: string }[] }

/** Paper */
export interface SheetProps { children: string; tape?: ('tl' | 'tr' | 'bl' | 'br')[] }
export interface WashesProps { washes: { pigment: 'sky' | 'meadow' | 'rose' | 'sun' | 'brook'; band?: boolean; w?: string; h?: string; ar?: number; left?: string; top?: string; right?: string; bottom?: string; bloom?: boolean }[]; sun?: { w: string; left?: string; top?: string; right?: string } }
export interface PageProps { children: string; folio?: number | string; lined?: boolean; side?: 'left' | 'right' }
export interface SpreadProps { pages: PageProps[]; label?: string }

/** Story */
export interface ProseProps { lede?: string; paragraphs: string[]; dropcap?: boolean; note?: string }
export interface CaptionProps { text: string; who?: string }
export interface BalloonProps { text: string; kind?: 'say' | 'think' | 'shout'; tail?: 'left' | 'right' | string }
export interface PanelsProps { cols?: number; panels: { cap?: string; sfx?: string; wide?: boolean; tall?: boolean; dots?: boolean; children?: string }[] }
export interface ReaderProps { title: string; target: string; fixed?: boolean; voicePicker?: boolean; ratePicker?: boolean }

/** Play */
export interface Stone { id?: string; label?: string; sub?: string; state?: StoneState; mark?: string; href?: string; why?: string }
export interface BrookOptions { stones: Stone[]; seed?: number; direction?: 'across' | 'down'; onStep?(stone: Stone, index: number, event: Event): void }
export interface BrookProps extends BrookOptions { height: string }
export interface CreatureOptions { form?: CreatureForm; stage?: CreatureStage; mood?: CreatureMood; hide?: CreatureHide; blink?: boolean; idle?: boolean; shut?: boolean; label?: string }
export interface CreatureProps extends CreatureOptions { width?: string }

/** Rewards */
export interface JarProps { cap?: number; fixed?: boolean }
export interface NougatProps { seed?: number; width?: string }
export interface StickerProps { id: string; name: string; icon?: IconName; art?: string; rot?: string; locked?: boolean }
export interface LockProps { id: string; why: string; how: string }

/** Shelf */
export interface ChipProps { label: string; tag?: Tag }
export interface CoverProps { title: string; line: string; href: string; art: string; chips?: ChipProps[]; price: string; each?: string; free?: boolean; isNew?: boolean; tilt?: string }
export interface ShelfProps { covers: CoverProps[] }

/** Navigation and overlays */
export interface TabsProps { tabs: { label: string; selected?: boolean; href?: string }[]; orientation?: 'vertical' }
export interface DialogProps { id: string; title: string; body: string; confirm: string; cancel?: string }
export interface DrawerProps { id: string; title: string; items: { label: string; icon?: IconName; href?: string; current?: boolean }[] }
export interface ToastProps { html: string; ms?: number }

/** Transitions */
export interface FoldProps { host: string; next: string }
export interface BlotProps { host: string; duration?: number }

/** The behavior API (window.Storeybrook) */
export interface ReadApi {
  readonly supported: boolean; readonly state: 'idle' | 'speaking' | 'paused'; voice: SpeechSynthesisVoice | null; rate: number; pitch: number;
  voices(): SpeechSynthesisVoice[]; pick(name?: string): SpeechSynthesisVoice | null; isIrish(v: SpeechSynthesisVoice | null): boolean;
  prepare(root: Element): { words: { el: HTMLElement; start: number; end: number }[]; text: string };
  speak(target: Element | string, o?: { voice?: string; rate?: number; pitch?: number }): boolean;
  pause(): void; resume(): void; toggle(target?: Element): void; stop(quiet?: boolean): void; bind(bar: HTMLElement, target?: Element): void;
}
export interface BrookApi { host: HTMLElement; stones: Stone[]; path: string; length: number; vertical: boolean; set(id: string, state: StoneState): void; layout(): void }
export interface CreatureApi { set(o: CreatureOptions): void; get(): CreatureOptions; stop(): void; stages: string[] }
export interface SpreadApi { next(): void; prev(): void; index(): number; count: number }
export interface StoreybrookApi {
  version: string;
  init(o?: { fallback?: LookId }): StoreybrookApi;
  theme: { list(): { id: LookId; name: string; line: string }[]; get(): LookId; set(id: LookId, o?: { persist?: boolean }): LookId; cycle(allowed?: LookId[]): LookId; init(o?: { fallback?: LookId }): LookId };
  density: { get(): Density; set(v: Density): Density; isTV(): boolean; init(): Density };
  nav: { on: boolean; enable(): void; move(dir: 'up' | 'down' | 'left' | 'right'): boolean; back(): boolean; candidates(): HTMLElement[] };
  read: ReadApi;
  rewards: { count(): number; set(n: number): void; paint(): void; drop(n: number, o?: { from?: Element; to?: Element; reason?: string }): void };
  unlocks: { list(): string[]; has(id: string): boolean; unlock(id: string, o?: { name?: string; line?: string; toast?: boolean }): boolean; lock(id: string): void; paint(just?: string, animate?: boolean): void };
  unlock(id: string, o?: { name?: string; line?: string; toast?: boolean }): boolean;
  brook(host: HTMLElement, o: BrookOptions): BrookApi | null;
  creature(host: HTMLElement, o?: CreatureOptions): CreatureApi | null;
  creatureSVG(o: CreatureOptions): string;
  spread(host: HTMLElement): SpreadApi | null;
  fold(host: HTMLElement, swap?: () => void): Promise<void>;
  blot(host: HTMLElement, o?: { duration?: number }): Promise<void>;
  drawer: { open(el: HTMLElement | string): void; close(el: HTMLElement | string): void };
  dialog: { open(el: HTMLDialogElement | string): void; close(el: HTMLDialogElement | string): void };
  toast(html: string, o?: { ms?: number }): HTMLElement;
  sound: { on: boolean; enable(on?: boolean): boolean; play(kind: PaperSound): void };
  haptic(pattern: number | number[]): void;
  icon(name: IconName, size?: number): string; icons: IconName[]; mountIcons(root?: Element): void;
  nougatSVG(seed?: number): string; jarSVG(fill: number): string;
  token(name: string): string; reducedMotion(): boolean; ensureDefs(): void;
}
declare global { interface Window { Storeybrook: StoreybrookApi } }
/** Events on window, as CustomEvent detail: sb:ready {version, theme, density}, sb:theme {theme}, sb:density {density}, sb:back {},
    sb:read {state, progress?, voice?}, sb:nougat {count, delta, reason?}, sb:unlock {id, name}, sb:step {id, index},
    sb:creature {form, stage}, sb:page {index, count}, sb:drawer {open, id}, sb:dialog {open, id}, sb:sound {on}. */
