'use client'

export function MobileBlockModal() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: '#ede9fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          marginBottom: 20,
        }}
      >
        🖥️
      </div>
      <h1 style={{ fontSize: 17, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
        Desktop required
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 320, lineHeight: 1.5 }}>
        The page builder needs a bigger screen to work properly — drag and drop, resize
        handles, and the side panel all need more room than a phone can give them.
      </p>
      <p style={{ fontSize: 14, color: '#6b7280', maxWidth: 320, lineHeight: 1.5, marginTop: 12 }}>
        Please switch to a tablet or desktop to continue editing.
      </p>
    </div>
  )
}


