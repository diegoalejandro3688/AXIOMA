import type { ComponentType } from 'react';
import {
  AiNavIcon,
  CompeteNavIcon,
  HomeNavIcon,
  ProfileNavIcon,
  StudyNavIcon,
  type NavIconProps,
} from './nav-icons';
import {
  BackArrowIcon,
  CheckIcon,
  ClockIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClipboardIcon,
  CloseIcon,
  ColumnIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  FlameIcon,
  FlaskIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  MenuIcon,
  MoreHorizontalIcon,
  OpenBookIcon,
  SettingsIcon,
  ShieldIcon,
  SquareRootIcon,
  StepsIcon,
  TargetIcon,
  XCircleIcon,
} from './action-icons';

export type { NavIconProps } from './nav-icons';

/** Registro tipado de iconos -- fuente única que resuelve `<Icon name="..." />`. */
export const iconRegistry = {
  // Navegación (bloque 6.6) -- no conectados a la tab bar todavía (UI-2).
  profile: ProfileNavIcon,
  compete: CompeteNavIcon,
  home: HomeNavIcon,
  study: StudyNavIcon,
  ai: AiNavIcon,
  // Acción
  'chevron-right': ChevronRightIcon,
  'chevron-up': ChevronUpIcon,
  'chevron-down': ChevronDownIcon,
  close: CloseIcon,
  'back-arrow': BackArrowIcon,
  eye: EyeIcon,
  'eye-off': EyeOffIcon,
  check: CheckIcon,
  clock: ClockIcon,
  'x-circle': XCircleIcon,
  info: InfoIcon,
  'more-horizontal': MoreHorizontalIcon,
  edit: EditIcon,
  settings: SettingsIcon,
  menu: MenuIcon,
  mail: MailIcon,
  lock: LockIcon,
  // Estado/académicos (UI-3)
  flame: FlameIcon,
  shield: ShieldIcon,
  'subject-math': SquareRootIcon,
  'subject-science': FlaskIcon,
  'subject-history': ColumnIcon,
  'subject-language': OpenBookIcon,
  // Modalidades de estudio dentro de una materia (STUDY-2)
  'study-mode-units': StepsIcon,
  'study-mode-resources': OpenBookIcon,
  'study-mode-practice': TargetIcon,
  'study-mode-essay': ClipboardIcon,
} satisfies Record<string, ComponentType<NavIconProps>>;

export type IconName = keyof typeof iconRegistry;
