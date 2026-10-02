import os
import re

ICON_MAP = {
    'Home': 'home',
    'FolderOpen': 'folder_open',
    'FileText': 'description',
    'Settings': 'settings',
    'Search': 'search',
    'Bell': 'notifications',
    'User': 'person',
    'ChevronRight': 'chevron_right',
    'ChevronLeft': 'chevron_left',
    'ChevronDown': 'keyboard_arrow_down',
    'CheckCircle2': 'check_circle',
    'CheckCircle': 'check_circle',
    'XCircle': 'cancel',
    'AlertCircle': 'error',
    'Info': 'info',
    'Upload': 'upload',
    'FileUp': 'file_upload',
    'Plus': 'add',
    'Trash2': 'delete',
    'Edit2': 'edit',
    'Download': 'download',
    'Clock': 'schedule',
    'Calendar': 'calendar_today',
    'MapPin': 'location_on',
    'Phone': 'phone',
    'Mail': 'mail',
    'Link': 'link',
    'ExternalLink': 'open_in_new',
    'Lock': 'lock',
    'Unlock': 'lock_open',
    'Shield': 'security',
    'File': 'insert_drive_file',
    'LogOut': 'logout',
    'Menu': 'menu',
    'X': 'close',
    'List': 'list',
    'Grid': 'grid_view',
    'Eye': 'visibility',
    'EyeOff': 'visibility_off',
    'MoreVertical': 'more_vert',
    'MoreHorizontal': 'more_horiz',
    'Activity': 'local_activity',
    'ArrowRight': 'arrow_forward',
    'ArrowLeft': 'arrow_back',
    'Check': 'check',
    'Play': 'play_arrow',
    'Pause': 'pause',
    'Square': 'stop',
    'Triangle': 'change_history',
    'Star': 'star',
    'Heart': 'favorite',
    'Files': 'file_copy',
    'Building2': 'account_balance',
    'Building': 'business',
    'Briefcase': 'work',
    'Users': 'group',
    'ShieldAlert': 'gpp_maybe',
    'ShieldCheck': 'gpp_good',
    'Folder': 'folder',
    'FileCheck': 'fact_check',
    'FileSearch': 'plagiarism',
    'ArrowUp': 'arrow_upward',
    'ArrowDown': 'arrow_downward',
    'Sparkles': 'auto_awesome',
    'AlertTriangle': 'warning',
    'Send': 'send',
    'Camera': 'photo_camera',
    'Image': 'image',
    'LayoutDashboard': 'dashboard',
    'ListTodo': 'checklist',
    'History': 'history',
    'Banknote': 'payments',
    'Wallet': 'account_balance_wallet',
    'CreditCard': 'credit_card',
    'PieChart': 'pie_chart',
    'BarChart': 'bar_chart',
    'TrendingUp': 'trending_up',
    'TrendingDown': 'trending_down',
    'DollarSign': 'attach_money',
    'Scale': 'balance',
    'Landmark': 'account_balance',
    'ShieldQuestion': 'help_center',
    'HelpCircle': 'help',
    'MessageSquare': 'chat',
    'MessageCircle': 'chat_bubble',
    'Paperclip': 'attach_file',
    'FileWarning': 'report_problem',
}

CLASS_MAP = {
    'text-slate-900': 'text-primary',
    'text-slate-800': 'text-primary',
    'text-slate-700': 'text-primary',
    'text-slate-600': 'text-outline',
    'text-slate-500': 'text-outline',
    'text-slate-400': 'text-outline',
    'text-slate-300': 'text-outline',
    'bg-slate-900': 'bg-primary',
    'bg-slate-800': 'bg-primary-container',
    'bg-slate-50': 'bg-background',
    'bg-slate-100': 'bg-surface-container-low',
    'bg-slate-200': 'bg-surface-container',
    'border-slate-200': 'border-outline/20',
    'border-slate-300': 'border-outline/30',
    
    'text-teal-900': 'text-primary',
    'text-teal-800': 'text-primary-container',
    'text-teal-700': 'text-primary-container',
    'text-teal-600': 'text-primary',
    'text-teal-500': 'text-primary',
    'bg-teal-50': 'bg-surface-container',
    'bg-teal-100': 'bg-surface-container',
    'bg-teal-600': 'bg-primary',
    'bg-teal-700': 'bg-primary-container',
    'hover:bg-teal-700': 'hover:bg-primary-container',
    'hover:bg-teal-600': 'hover:bg-primary',
    'border-teal-200': 'border-primary/20',
    'ring-teal-500': 'ring-primary',
    'text-white': 'text-on-primary',
}

def convert_icon_tag(match):
    tag = match.group(1)
    props = match.group(2)
    
    if tag not in ICON_MAP:
        return match.group(0) # Don't replace if not in map, might not be Lucide
        
    mat_icon = ICON_MAP[tag]
    
    # Extract className if exists
    class_match = re.search(r'className=(["\'])(.*?)\1', props)
    classes = class_match.group(2) if class_match else ""
    
    # Remove w- and h- classes and replace with text size
    new_classes = re.sub(r'\bw-\d+\b', '', classes)
    new_classes = re.sub(r'\bh-\d+\b', '', new_classes)
    
    # Remove the className from props completely so we can rebuild
    other_props = re.sub(r'className=["\'].*?["\']', '', props).strip()
    
    # Build new class string
    final_classes = f"material-symbols-outlined {new_classes}".strip()
    # clean up double spaces
    final_classes = re.sub(r'\s+', ' ', final_classes)
    
    # Build span
    if other_props:
        return f'<span className="{final_classes}" {other_props}>{mat_icon}</span>'
    else:
        return f'<span className="{final_classes}">{mat_icon}</span>'

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove lucide imports
    content = re.sub(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"];?\n?', '', content)
    
    # 2. Replace icon tags: <IconName className="..." />
    # This regex matches <TagName props /> where TagName starts with a capital letter
    content = re.sub(r'<([A-Z][a-zA-Z0-9]*)\s*([^>]*?)\s*/>', convert_icon_tag, content)

    # 3. Replace old tailwind classes
    for old_cls, new_cls in CLASS_MAP.items():
        # using word boundaries to ensure exact match of class
        content = re.sub(r'\b' + re.escape(old_cls) + r'\b', new_cls, content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    src_dir = r"e:\Enigma_HTTPS\estateclear\apps\web\src"
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
