export const CATEGORIES = [
  {
    id: 'performance',
    label: 'Performance-Based',
    color: '#C9A84C',
    icon: '🎭',
    events: [
      { id: 'singing-solo', name: 'Singing', type: 'Solo', 
        isGroup: false, is_active: true },
      { id: 'singing-band', name: 'Singing', type: 'Band', 
        isGroup: true, is_active: true },
      { id: 'dance-solo', name: 'Dance', type: 'Solo', 
        isGroup: false, is_active: true },
      { id: 'dance-crew', name: 'Dance', type: 'Crew', 
        isGroup: true, is_active: true },
      { id: 'instrumental', name: 'Instrumental', type: 'Solo', 
        isGroup: false, is_active: true },
    ]
  },
  {
    id: 'expression',
    label: 'Expression-Based',
    color: '#C9A84C',
    icon: '🎤',
    events: [
      { id: 'standup-comedy', name: 'Stand-up Comedy', type: 'Solo', 
        isGroup: false, is_active: true },
      { id: 'poetry', name: 'Poetry', type: 'Solo', 
        isGroup: false, is_active: true },
      { id: 'rap', name: 'Rap', type: 'Solo', 
        isGroup: false, is_active: true },
      { id: 'beatboxing', name: 'Beatboxing', type: 'Solo', 
        isGroup: false, is_active: true },
    ]
  },
  {
    id: 'creative',
    label: 'Creative Talents',
    color: '#C9A84C',
    icon: '🎨',
    events: [
      { id: 'art-painting', name: 'Art (Live Painting)', type: 'Solo', 
        isGroup: false, is_active: true },
      { id: 'fashion-walk', name: 'Fashion Walk / Styling', type: 'Solo', 
        isGroup: false, is_active: true },
      { id: 'reel-making', name: 'Reel-making', type: 'Solo', 
        isGroup: false, is_active: true },
      { id: 'content-creation', name: 'Content Creation', type: 'Solo', 
        isGroup: false, is_active: true },
    ]
  },
  {
    id: 'wildcard',
    label: 'Wildcard Category',
    color: '#C9A84C',
    icon: '⚡',
    events: [
      { id: 'anything-talent', name: 'Anything Talent', 
        description: 'magic, mimicry, freestyle, etc.',
        type: 'Open', isGroup: false, is_active: true },
    ]
  }
]

// Global Others — not part of any category
export const OTHERS_EVENT = {
  id: 'others',
  name: 'Others',
  isOthers: true,
  is_active: true
}

export const VOLUNTEER_TEAMS = [
  { id: 'registration-reception', label: 'Registration & Reception Team' },
  { id: 'program-coordination', label: 'Program Coordination Team' },
  { id: 'discipline-security', label: 'Discipline & Security Committee' },
  { id: 'hospitality-welfare', label: 'Hospitality & Welfare Team' },
]

// Flat EVENTS array for backward compatibility
export const EVENTS = CATEGORIES.flatMap(cat => 
  cat.events.map(ev => ({ ...ev, categoryId: cat.id, categoryLabel: cat.label }))
)

export default CATEGORIES
