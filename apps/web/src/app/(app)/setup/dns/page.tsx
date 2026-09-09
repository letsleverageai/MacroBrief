import clsx from "clsx";
import { Check, Cloud, Globe, Lock, Server, ShieldCheck, TerminalSquare } from "lucide-react";
import { Badge, Card, CardHeader } from "@/components/ui";

// Illustrative values — swap for the real ones.
const DOMAIN = "brief.example.com";
const IPV4 = "203.0.113.10";
const IPV6 = "2a01:4f8:c012:1a2b::1";
const NS = ["ada.ns.cloudflare.com", "rob.ns.cloudflare.com"];

const RECORDS = [
  { type: "A", name: "brief", content: IPV4, proxy: true, ttl: "Auto", note: "Points the site at the Hetzner box" },
  { type: "AAAA", name: "brief", content: IPV6, proxy: true, ttl: "Auto", note: "IPv6 (Hetzner gives you a /64 free)" },
  { type: "CNAME", name: "www", content: DOMAIN, proxy: true, ttl: "Auto", note: "Optional: www → apex" },
  { type: "TXT", name: "@", content: "v=spf1 include:amazonses.com ~all", proxy: false, ttl: "Auto", note: "Email: Resend/SES SPF" },
  { type: "CNAME", name: "resend._domainkey", content: "resend._domainkey.example.resend.com", proxy: false, ttl: "Auto", note: "Email: DKIM (from Resend dashboard)" },
  { type: "TXT", name: "_dmarc", content: "v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com", proxy: false, ttl: "Auto", note: "Email: DMARC so the 06:00 brief lands in inbox" },
  { type: "CAA", name: "@", content: '0 issue "letsencrypt.org"', proxy: false, ttl: "Auto", note: "Only Let's Encrypt may issue certs" },
];

const CF_IP_RANGES = ["173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22"];

function Step({ n, icon: Icon, title, time, children }: { n: number; icon: React.ElementType; title: string; time: string; children: React.ReactNode }) {
  return (
    <li className="relative pl-12">
      <div className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="num text-[11px] text-fg-3">STEP {n}</span>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <span className="ml-auto text-[11px] text-fg-3">~{time}</span>
      </div>
      <div className="space-y-3 text-sm text-fg-2">{children}</div>
    </li>
  );
}

function Cmd({ children }: { children: string }) {
  return (
    <pre className="scrollbar-thin overflow-x-auto rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12px] leading-relaxed text-fg">{children}</pre>
  );
}

function Toggle({ label, on = true, value }: { label: string; on?: boolean; value?: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-panel-2/40 px-3 py-2 text-xs">
      <span className="text-fg">{label}</span>
      {value ? (
        <Badge tone="accent">{value}</Badge>
      ) : (
        <span className={clsx("relative inline-flex h-4 w-8 items-center rounded-full", on ? "bg-up" : "bg-line-2")}>
          <span className={clsx("absolute h-3 w-3 rounded-full bg-white transition", on ? "left-[18px]" : "left-0.5")} />
        </span>
      )}
    </div>
  );
}

export default function DnsSetupPage() {
  return (
    <div className="mx-auto max-w-[1300px] space-y-6">
      <header className="fade-up">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Setup guide</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">DNS &amp; TLS: Cloudflare in front of Hetzner</h1>
        <p className="mt-1 max-w-3xl text-sm text-fg-2">
          Registrar → Cloudflare nameservers → DNS records pointing at the Hetzner IP (proxied) → Full (strict) TLS → lock the origin so only Cloudflare can reach it → verify.
          About 30 minutes; DNS propagation is the only wait.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <ol className="space-y-10">
          <Step n={1} icon={Server} title="Hetzner: create the server, note its IPs" time="5 min">
            <Card>
              <CardHeader title="Hetzner Cloud → Servers" right={<Badge tone="up">running</Badge>} />
              <div className="grid gap-px bg-line sm:grid-cols-4">
                {[
                  ["Name", "macrobrief-prod"],
                  ["Type", "CX22 · 2 vCPU · 4 GB · €4.51/mo"],
                  ["Location", "Nuremberg (eu-central)"],
                  ["Image", "Ubuntu 24.04"],
                  ["IPv4", IPV4],
                  ["IPv6", IPV6 + "/64"],
                  ["SSH key", "analyst-macbook (ed25519)"],
                  ["Cloud firewall", "cf-only (see step 5)"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-panel px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wider text-fg-3">{k}</div>
                    <div className="num mt-0.5 truncate text-xs text-fg">{v}</div>
                  </div>
                ))}
              </div>
            </Card>
            <p>Add your SSH key at creation (no password login), then run the hardening script once as root:</p>
            <Cmd>{`ssh root@${IPV4}\nbash <(curl -fsSL https://raw.githubusercontent.com/<you>/macrobrief/main/deploy/hetzner-bootstrap.sh)`}</Cmd>
          </Step>

          <Step n={2} icon={Globe} title="Cloudflare: add the domain, switch nameservers at the registrar" time="5 min + propagation">
            <p>
              Cloudflare → <b className="text-fg">Add a site</b> → Free plan → it imports existing records. It gives you two nameservers; paste them at the registrar (GoDaddy, Namecheap, Google/Squarespace…) replacing whatever is there.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {NS.map((n) => (
                <div key={n} className="flex items-center justify-between rounded-md border border-line bg-panel px-3 py-2 font-mono text-xs">
                  <span>{n}</span>
                  <Badge tone="up">active</Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-fg-3">Registrar changes take 5 minutes to 24 hours. Cloudflare emails you when the zone is active. Check with:</p>
            <Cmd>{`dig +short NS example.com\n# → ada.ns.cloudflare.com.  rob.ns.cloudflare.com.`}</Cmd>
          </Step>

          <Step n={3} icon={Cloud} title="Cloudflare DNS: point the hostname at Hetzner" time="5 min">
            <Card>
              <CardHeader title="DNS → Records" sub="Orange cloud = proxied through Cloudflare (hides the origin IP). Grey = DNS only." />
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-fg-3">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left"><th>Type</th><th>Name</th><th>Content</th><th>Proxy</th><th>TTL</th><th>Why</th></tr>
                  </thead>
                  <tbody>
                    {RECORDS.map((r) => (
                      <tr key={r.type + r.name} className="border-t border-line/70 hover:bg-panel-2/40 [&>td]:px-3 [&>td]:py-2">
                        <td><Badge tone="accent">{r.type}</Badge></td>
                        <td className="font-mono text-fg">{r.name}</td>
                        <td className="max-w-[260px] truncate font-mono text-fg-2" title={r.content}>{r.content}</td>
                        <td>
                          <span className={clsx("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", r.proxy ? "bg-[#f6821f]/15 text-[#f6821f]" : "bg-panel-2 text-fg-3")}>
                            <Cloud className="h-3 w-3" /> {r.proxy ? "Proxied" : "DNS only"}
                          </span>
                        </td>
                        <td className="text-fg-3">{r.ttl}</td>
                        <td className="text-fg-3">{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <p className="text-xs text-fg-3">Email records (TXT/CNAME) must stay <b>DNS only</b>; Cloudflare only proxies HTTP. Values come from the Resend (or SES/Postmark) dashboard.</p>
          </Step>

          <Step n={4} icon={Lock} title="Cloudflare SSL/TLS: Full (strict) end-to-end" time="2 min">
            <p>
              Browser ↔ Cloudflare uses Cloudflare&apos;s edge cert (automatic). Cloudflare ↔ Hetzner uses the Let&apos;s Encrypt cert Caddy issues. <b className="text-fg">Full (strict)</b> makes Cloudflare verify it — never use &quot;Flexible&quot; (plaintext to origin).
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle label="Encryption mode" value="Full (strict)" />
              <Toggle label="Always Use HTTPS" />
              <Toggle label="Automatic HTTPS Rewrites" />
              <Toggle label="Minimum TLS version" value="1.2" />
              <Toggle label="TLS 1.3" />
              <Toggle label="HSTS (after it works)" />
            </div>
            <p className="text-xs text-fg-3">
              Caddy gets its cert via HTTP-01 on port 80, which Cloudflare proxies through — so nothing extra is needed. If you prefer, give Caddy a Cloudflare API token and use the DNS challenge (works even with port 80 closed).
            </p>
          </Step>

          <Step n={5} icon={ShieldCheck} title="Lock the origin: only Cloudflare may talk to Hetzner" time="5 min">
            <p>
              With the orange cloud on, the public never sees {IPV4} — but a scanner could still hit it directly. Close that door with a <b className="text-fg">Hetzner Cloud Firewall</b> that allows 80/443 only from Cloudflare&apos;s IP ranges, and 22 only from your IP (or Tailscale).
            </p>
            <Card>
              <CardHeader title="Hetzner → Firewalls → cf-only" right={<span>applied to macrobrief-prod</span>} />
              <div className="divide-y divide-line text-xs">
                <div className="grid grid-cols-[80px_1fr_1fr] gap-3 px-3 py-2 text-[10px] uppercase tracking-wider text-fg-3"><span>Port</span><span>Source</span><span>Purpose</span></div>
                <div className="grid grid-cols-[80px_1fr_1fr] gap-3 px-3 py-2"><span className="num">22/tcp</span><span className="font-mono text-fg-2">198.51.100.7/32 (home) · 100.64.0.0/10 (Tailscale)</span><span className="text-fg-3">SSH, keys only</span></div>
                <div className="grid grid-cols-[80px_1fr_1fr] gap-3 px-3 py-2"><span className="num">80, 443</span><span className="font-mono text-fg-2">{CF_IP_RANGES.slice(0, 4).join(" · ")} … (+11 IPv4, 7 IPv6)</span><span className="text-fg-3">Only Cloudflare edge</span></div>
                <div className="grid grid-cols-[80px_1fr_1fr] gap-3 px-3 py-2"><span className="num">*</span><span className="font-mono text-fg-2">any</span><span className="text-fg-3">Drop everything else</span></div>
              </div>
            </Card>
            <Cmd>{`# current lists (refresh quarterly):\ncurl -s https://www.cloudflare.com/ips-v4\ncurl -s https://www.cloudflare.com/ips-v6`}</Cmd>
            <p className="text-xs text-fg-3">
              Optional extra layer, free for ≤50 users: <b>Cloudflare Zero Trust → Access → Application</b> for <span className="font-mono">{DOMAIN}</span>, policy “Allow: emails ending in @yourfund.com” with one-time PIN. Nobody even reaches the login page without it.
            </p>
          </Step>

          <Step n={6} icon={TerminalSquare} title="Deploy & verify" time="10 min">
            <Cmd>{`ssh deploy@${IPV4}\ngit clone https://github.com/<you>/macrobrief && cd macrobrief/deploy\ncp .env.example .env && nano .env        # DOMAIN=${DOMAIN}, ACME_EMAIL, secrets\ndocker compose up -d --build\ndocker compose logs -f caddy             # wait for "certificate obtained successfully"`}</Cmd>
            <Cmd>{`dig +short ${DOMAIN}                     # → Cloudflare IPs (104.x / 172.x), NOT ${IPV4}\ncurl -sI https://${DOMAIN} | grep -iE "^(HTTP|cf-ray|strict-transport)"\ncurl -sI http://${IPV4} --max-time 5      # should time out — origin locked\nssl-labs: https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}`}</Cmd>
          </Step>
        </ol>

        <aside className="space-y-4 lg:sticky lg:top-16 lg:self-start">
          <Card>
            <CardHeader title="Checklist" right={<Badge tone="up">6 / 8</Badge>} />
            <ul className="divide-y divide-line text-xs">
              {[
                ["Hetzner server created, SSH key only", true],
                ["Bootstrap script run (ufw, fail2ban, docker)", true],
                ["Nameservers switched to Cloudflare", true],
                ["A / AAAA records proxied (orange)", true],
                ["SSL mode Full (strict), Always HTTPS", true],
                ["Email SPF / DKIM / DMARC (DNS only)", true],
                ["Hetzner firewall: Cloudflare IPs only", false],
                ["Cloudflare Access policy (optional)", false],
              ].map(([t, done]) => (
                <li key={t as string} className="flex items-start gap-2 px-3 py-2">
                  <span className={clsx("mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border", done ? "border-up/50 bg-up/15 text-up" : "border-line-2 text-transparent")}>
                    <Check className="h-3 w-3" />
                  </span>
                  <span className={clsx(done ? "text-fg-2" : "text-fg")}>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Live status" sub="What a health panel would show" />
            <div className="divide-y divide-line text-xs">
              {[
                ["Zone", "active on Cloudflare", "up"],
                ["Propagation", "100% (8/8 resolvers)", "up"],
                [`${DOMAIN} → edge`, "104.21.x.x · cf-ray present", "up"],
                ["Edge cert", "Cloudflare · expires 2027-03", "up"],
                ["Origin cert", "Let's Encrypt · renews in 61d", "up"],
                ["Origin exposed?", "port 443 direct: filtered", "up"],
                ["HSTS", "not yet — enable after 48h", "amber"],
              ].map(([k, v, tone]) => (
                <div key={k as string} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-fg-2">{k}</span>
                  <span className="flex items-center gap-1.5 text-right text-fg">
                    <span className={clsx("h-1.5 w-1.5 rounded-full", tone === "up" ? "bg-up" : "bg-amber")} />
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Traffic path" />
            <div className="space-y-1 p-3 font-mono text-[11px] text-fg-2">
              <div>Browser</div>
              <div className="pl-3 text-fg-3">│ TLS (Cloudflare edge cert)</div>
              <div>Cloudflare edge <span className="text-fg-3">— WAF, rate limit, Access</span></div>
              <div className="pl-3 text-fg-3">│ TLS (Let&apos;s Encrypt), Cloudflare IPs only</div>
              <div>Hetzner: Caddy :443</div>
              <div className="pl-3 text-fg-3">│ docker network</div>
              <div>web :3000 → pipeline :8000 → postgres</div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Gotchas" />
            <ul className="list-disc space-y-1.5 px-6 py-3 text-xs text-fg-2">
              <li>“Flexible” SSL = plaintext between Cloudflare and Hetzner. Always Full (strict).</li>
              <li>Proxying email records breaks mail. Keep TXT/MX/DKIM grey.</li>
              <li>Turning on the orange cloud before Caddy has a cert → 522/526 for a minute. Wait for the Caddy log line.</li>
              <li>If you later use the Cloudflare DNS challenge, scope the API token to <i>Zone:DNS:Edit</i> for one zone only.</li>
              <li>Hetzner firewall rules apply at the network edge — <span className="font-mono">ufw</span> on the box is a second layer, keep both.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
