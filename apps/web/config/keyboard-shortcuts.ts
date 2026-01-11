/**
 * Keyboard Shortcuts Configuration
 * Central configuration for all keyboard shortcuts in the application
 * Used by the KeyboardShortcutsGuide component
 */

export interface ShortcutItem {
  /** Key combination (use ⌘ for Cmd/Ctrl, ⇧ for Shift, ⌥ for Alt) */
  keys: string[];
  /** Description of what the shortcut does */
  description: string;
  /** Optional: macOS-specific key display */
  macKeys?: string[];
  /** Optional: Windows/Linux-specific key display */
  winKeys?: string[];
}

export interface ShortcutCategory {
  /** Category title */
  title: string;
  /** Category icon name (lucide-react) */
  icon: string;
  /** Shortcuts in this category */
  shortcuts: ShortcutItem[];
}

/**
 * All keyboard shortcuts organized by category
 */
export const keyboardShortcuts: ShortcutCategory[] = [
  {
    title: '通用',
    icon: 'Keyboard',
    shortcuts: [
      {
        keys: ['⌘', 'K'],
        description: '打开全局搜索',
        macKeys: ['⌘', 'K'],
        winKeys: ['Ctrl', 'K'],
      },
      {
        keys: ['⌘', 'D'],
        description: '打开数据资源库',
        macKeys: ['⌘', 'D'],
        winKeys: ['Ctrl', 'D'],
      },
      {
        keys: ['⌘', 'Z'],
        description: '撤销',
        macKeys: ['⌘', 'Z'],
        winKeys: ['Ctrl', 'Z'],
      },
      {
        keys: ['⌘', '⇧', 'Z'],
        description: '重做',
        macKeys: ['⌘', '⇧', 'Z'],
        winKeys: ['Ctrl', 'Y'],
      },
      {
        keys: ['Esc'],
        description: '关闭对话框 / 退出当前模式',
      },
    ],
  },
  {
    title: '节点操作',
    icon: 'MousePointer2',
    shortcuts: [
      {
        keys: ['Tab'],
        description: '创建子节点',
      },
      {
        keys: ['Enter'],
        description: '创建同级节点',
      },
      {
        keys: ['Space'],
        description: '进入编辑模式',
      },
      {
        keys: ['Delete'],
        description: '删除选中节点（归档）',
      },
      {
        keys: ['⇧', 'Delete'],
        description: '永久删除选中节点',
      },
      {
        keys: ['⌘', 'Enter'],
        description: '进入子图（钻取）',
        macKeys: ['⌘', 'Enter'],
        winKeys: ['Ctrl', 'Enter'],
      },
    ],
  },
  {
    title: '剪贴板',
    icon: 'Clipboard',
    shortcuts: [
      {
        keys: ['⌘', 'C'],
        description: '复制选中节点',
        macKeys: ['⌘', 'C'],
        winKeys: ['Ctrl', 'C'],
      },
      {
        keys: ['⌘', 'X'],
        description: '剪切选中节点',
        macKeys: ['⌘', 'X'],
        winKeys: ['Ctrl', 'X'],
      },
      {
        keys: ['⌘', 'V'],
        description: '粘贴节点',
        macKeys: ['⌘', 'V'],
        winKeys: ['Ctrl', 'V'],
      },
    ],
  },
  {
    title: '视图控制',
    icon: 'Eye',
    shortcuts: [
      {
        keys: ['⌘', '0'],
        description: '适应画布（显示全部节点）',
        macKeys: ['⌘', '0'],
        winKeys: ['Ctrl', '0'],
      },
      {
        keys: ['⌘', '1'],
        description: '重置缩放到 100%',
        macKeys: ['⌘', '1'],
        winKeys: ['Ctrl', '1'],
      },
      {
        keys: ['M'],
        description: '切换小地图显示',
      },
      {
        keys: ['F'],
        description: '切换专注模式',
      },
    ],
  },
  {
    title: '折叠/展开',
    icon: 'ChevronDown',
    shortcuts: [
      {
        keys: ['⌘', '['],
        description: '折叠当前节点',
        macKeys: ['⌘', '['],
        winKeys: ['Ctrl', '['],
      },
      {
        keys: ['⌘', ']'],
        description: '展开当前节点',
        macKeys: ['⌘', ']'],
        winKeys: ['Ctrl', ']'],
      },
      {
        keys: ['⌘', '⌥', '['],
        description: '递归折叠所有子节点',
        macKeys: ['⌘', '⌥', '['],
        winKeys: ['Ctrl', 'Alt', '['],
      },
    ],
  },
  {
    title: '导航',
    icon: 'Navigation',
    shortcuts: [
      {
        keys: ['↑'],
        description: '选择上方节点',
      },
      {
        keys: ['↓'],
        description: '选择下方节点',
      },
      {
        keys: ['←'],
        description: '选择左侧/父节点',
      },
      {
        keys: ['→'],
        description: '选择右侧/子节点',
      },
    ],
  },
  {
    title: '附件查看器',
    icon: 'Image',
    shortcuts: [
      {
        keys: ['←'],
        description: '上一张图片',
      },
      {
        keys: ['→'],
        description: '下一张图片',
      },
      {
        keys: ['Esc'],
        description: '关闭查看器',
      },
    ],
  },
];

/**
 * Get platform-specific key display
 */
export function getPlatformKeys(shortcut: ShortcutItem, isMac: boolean): string[] {
  if (isMac && shortcut.macKeys) {
    return shortcut.macKeys;
  }
  if (!isMac && shortcut.winKeys) {
    return shortcut.winKeys;
  }
  return shortcut.keys;
}
