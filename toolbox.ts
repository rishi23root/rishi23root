/** Toolbox shields (flat shields.io). Edit this list to add/remove badges. */
export type Shield = {
  label: string
  color: string
  logo?: string
  logoColor?: string
}

export const toolbox: Shield[] = [
  { label: 'TypeScript', color: '007ACC', logo: 'typescript', logoColor: 'white' },
  { label: 'JavaScript', color: 'F7DF1E', logo: 'javascript', logoColor: 'black' },
  { label: 'Python', color: '3776AB', logo: 'python', logoColor: 'white' },
  { label: 'HTML5', color: 'E34F26', logo: 'html5', logoColor: 'white' },
  { label: 'Sass', color: 'CC6699', logo: 'sass', logoColor: 'white' },
  { label: 'React', color: '45b8d8', logo: 'react', logoColor: 'white' },
  { label: 'React Native', color: '61DAFB', logo: 'react', logoColor: 'white' },
  { label: 'Expo', color: '000020', logo: 'expo', logoColor: 'white' },
  { label: 'TanStack Query', color: 'FF4154', logo: 'reactquery', logoColor: 'white' },
  { label: 'Next.js', color: '000000', logo: 'nextdotjs', logoColor: 'white' },
  { label: 'Three.js', color: '000000', logo: 'threedotjs', logoColor: 'white' },
  { label: 'GSAP', color: '88CE02', logo: 'greensock', logoColor: 'black' },
  { label: 'Framer Motion', color: '0055FF', logo: 'framer', logoColor: 'white' },
  { label: 'Tailwind CSS', color: '50B3D0', logo: 'tailwindcss', logoColor: 'white' },
  { label: 'Node.js', color: '43853d', logo: 'nodedotjs', logoColor: 'white' },
  { label: 'Express', color: '000000', logo: 'express', logoColor: 'white' },
  { label: 'FastAPI', color: '009688', logo: 'fastapi', logoColor: 'white' },
  { label: 'Flask', color: '000000', logo: 'flask', logoColor: 'white' },
  { label: 'Django', color: '092E20', logo: 'django', logoColor: 'white' },
  { label: 'Celery', color: '37814A', logo: 'celery', logoColor: 'white' },
  { label: 'Streamlit', color: 'FF4B4B', logo: 'streamlit', logoColor: 'white' },
  { label: 'GraphQL', color: 'E10098', logo: 'graphql', logoColor: 'white' },
  { label: 'tRPC', color: '2596BE', logo: 'trpc', logoColor: 'white' },
  { label: 'npm', color: 'CB3837', logo: 'npm', logoColor: 'white' },
  { label: 'Prisma', color: '2D3748', logo: 'prisma', logoColor: 'white' },
  { label: 'Drizzle', color: 'C5F74F', logo: 'drizzle', logoColor: 'black' },
  { label: 'Socket.io', color: '010101', logo: 'socketdotio', logoColor: 'white' },
  { label: 'LangChain', color: '1C3C3C' },
  { label: 'LlamaIndex', color: '8B5CF6' },
  { label: 'Hugging Face', color: 'FFD21E', logo: 'huggingface', logoColor: 'black' },
  { label: 'Ollama', color: '000000', logo: 'ollama', logoColor: 'white' },
  { label: 'Whisper', color: '412991' },
  { label: 'MediaPipe', color: '0097A7', logo: 'google', logoColor: 'white' },
  { label: 'OpenCV', color: '5C3EE8', logo: 'opencv', logoColor: 'white' },
  { label: 'Pandas', color: '150458', logo: 'pandas', logoColor: 'white' },
  { label: 'NumPy', color: '013243', logo: 'numpy', logoColor: 'white' },
  { label: 'Jupyter', color: 'F37626', logo: 'jupyter', logoColor: 'white' },
  { label: 'MongoDB', color: '47A248', logo: 'mongodb', logoColor: 'white' },
  { label: 'PostgreSQL', color: '4169E1', logo: 'postgresql', logoColor: 'white' },
  { label: 'Redis', color: 'DC382D', logo: 'redis', logoColor: 'white' },
  { label: 'Elasticsearch', color: '005571', logo: 'elasticsearch', logoColor: 'white' },
  { label: 'Kafka', color: '231F20', logo: 'apachekafka', logoColor: 'white' },
  { label: 'RabbitMQ', color: 'FF6600', logo: 'rabbitmq', logoColor: 'white' },
  { label: 'BigQuery', color: '669DF6', logo: 'googlebigquery', logoColor: 'white' },
  { label: 'Snowflake', color: '29B5E8', logo: 'snowflake', logoColor: 'white' },
  { label: 'Bash', color: '4EAA25', logo: 'gnubash', logoColor: 'white' },
  { label: 'Selenium', color: '43B02A', logo: 'selenium', logoColor: 'white' },
  { label: 'Playwright', color: '2EAD33', logo: 'playwright', logoColor: 'white' },
  { label: 'Puppeteer', color: '40B5A4', logo: 'puppeteer', logoColor: 'white' },
  { label: 'n8n', color: 'EA4B71', logo: 'n8n', logoColor: 'white' },
  { label: 'Burp Suite', color: 'FF6633' },
  { label: 'Metasploit', color: '2596BE' },
  { label: 'Caido', color: '111111' },
  { label: 'OWASP ZAP', color: '00549E', logo: 'owasp', logoColor: 'white' },
  { label: 'Nmap', color: '4682B4' },
  { label: 'Wireshark', color: '1679A7', logo: 'wireshark', logoColor: 'white' },
  { label: 'sqlmap', color: '2E8B57' },
  { label: 'Kali', color: '557C94', logo: 'kalilinux', logoColor: 'white' },
  { label: 'BloodHound', color: 'C41230' },
  { label: 'Nuclei', color: '3D5AFE' },
  { label: 'ffuf', color: 'FF5722' },
  { label: 'Hashcat', color: '2E7D32' },
  { label: 'Loki', color: 'F46800', logo: 'grafana', logoColor: 'white' },
  { label: 'Grafana', color: 'F46800', logo: 'grafana', logoColor: 'white' },
  { label: 'Tempo', color: 'F46800', logo: 'grafana', logoColor: 'white' },
  { label: 'Mimir', color: 'F46800', logo: 'grafana', logoColor: 'white' },
  { label: 'Alloy', color: 'F46800', logo: 'grafana', logoColor: 'white' },
  { label: 'Sentry', color: '362D59', logo: 'sentry', logoColor: 'white' },
  { label: 'Docker', color: '2496ED', logo: 'docker', logoColor: 'white' },
  { label: 'Kubernetes', color: '326CE5', logo: 'kubernetes', logoColor: 'white' },
  { label: 'Terraform', color: '7B42BC', logo: 'terraform', logoColor: 'white' },
  { label: 'Nginx', color: '009639', logo: 'nginx', logoColor: 'white' },
  { label: 'Caddy', color: '1F88C0', logo: 'caddy', logoColor: 'white' },
  { label: 'Git', color: 'F05032', logo: 'git', logoColor: 'white' },
  { label: 'GitHub Actions', color: '2088FF', logo: 'githubactions', logoColor: 'white' },
  { label: 'Linux', color: 'FCC624', logo: 'linux', logoColor: 'black' },
  { label: 'AWS', color: '232F3E', logo: 'amazonaws', logoColor: 'white' },
  { label: 'AWS Lambda', color: 'FF9900', logo: 'awslambda', logoColor: 'white' },
  { label: 'GCP', color: '4285F4', logo: 'googlecloud', logoColor: 'white' },
  { label: 'Cloudflare', color: 'F38020', logo: 'cloudflare', logoColor: 'white' },
  { label: 'Cloudflare Workers', color: 'F38020', logo: 'cloudflareworkers', logoColor: 'white' },
  { label: 'Vercel', color: '000000', logo: 'vercel', logoColor: 'white' },
  { label: 'Linode', color: '00A95C', logo: 'linode', logoColor: 'white' },
  { label: 'DigitalOcean', color: '0080FF', logo: 'digitalocean', logoColor: 'white' },
  { label: 'Unreal Engine', color: '0E1128', logo: 'unrealengine', logoColor: 'white' },
  { label: 'Pixel Streaming', color: '0E1128', logo: 'unrealengine', logoColor: 'white' },
  { label: 'Postman', color: 'FF6C37', logo: 'postman', logoColor: 'white' },
  { label: 'Figma', color: 'F24E1E', logo: 'figma', logoColor: 'white' },
  { label: 'Notion', color: '000000', logo: 'notion', logoColor: 'white' },
  { label: 'Obsidian', color: '7C3AED', logo: 'obsidian', logoColor: 'white' },
  { label: 'Linear', color: '5E6AD2', logo: 'linear', logoColor: 'white' },
  { label: 'Slack', color: '4A154B', logo: 'slack', logoColor: 'white' },
  { label: 'Discord', color: '5865F2', logo: 'discord', logoColor: 'white' },
  { label: 'Cursor', color: '000000' },
  { label: 'Claude', color: 'D97757', logo: 'anthropic', logoColor: 'white' },
]

/** Render Toolbox <p> of flat shields.io badges. */
export function renderToolbox(shields: Shield[] = toolbox): string {
  const imgs = shields.map(({ label, color, logo, logoColor }) => {
    const encoded = encodeURIComponent(label)
    let src = `https://img.shields.io/badge/${encoded}-${color}?style=flat`
    if (logo) src += `&logo=${logo}`
    if (logoColor) src += `&logoColor=${logoColor}`
    return `  <img alt="${label}" src="${src}" />`
  })
  return `<p>\n${imgs.join('\n')}\n</p>`
}

