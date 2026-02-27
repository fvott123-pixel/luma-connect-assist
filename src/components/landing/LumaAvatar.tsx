const LumaAvatar = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="32" fill="#1A5C38" />
    <ellipse cx="32" cy="28" rx="14" ry="15" fill="#FDDCB5" />
    <ellipse cx="32" cy="16" rx="15" ry="12" fill="#3D2B1A" />
    <path d="M17 16c0-7 6.7-13 15-13s15 6 15 13c0 3-1 4-3 4-1 0-2-1-3-3-2-4-5-6-9-6s-7 2-9 6c-1 2-2 3-3 3-2 0-3-1-3-4z" fill="#3D2B1A" />
    <circle cx="26" cy="27" r="2" fill="#3D2B1A" />
    <circle cx="38" cy="27" r="2" fill="#3D2B1A" />
    <path d="M28 33q4 3 8 0" stroke="#3D2B1A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="22" cy="30" r="3" fill="#F4A7A7" opacity="0.4" />
    <circle cx="42" cy="30" r="3" fill="#F4A7A7" opacity="0.4" />
    <path d="M20 44c0-4 5-8 12-8s12 4 12 8v8c0 2-1 4-3 4H23c-2 0-3-2-3-4v-8z" fill="#1A5C38" />
    <path d="M28 44v12M36 44v12" stroke="#2E7D52" strokeWidth="1" opacity="0.5" />
  </svg>
);

export default LumaAvatar;
