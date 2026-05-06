import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Copy, Check, Hash, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// 암호화/인코딩 블록
export const CryptoBlock = ({ type, data }: { type?: string; data?: string }) => {
  const [input, setInput] = useState(data || '');
  const [output, setOutput] = useState('');
  const [cryptoType, setCryptoType] = useState(type || 'base64');
  const [operation, setOperation] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);

  const process = () => {
    try {
      if (operation === 'encode') {
        switch (cryptoType) {
          case 'base64':
            setOutput(btoa(input));
            break;
          case 'hex':
            setOutput(Array.from(input).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
            break;
          case 'url':
            setOutput(encodeURIComponent(input));
            break;
          case 'md5':
            // 간단한 해시 시뮬레이션 (실제로는 서버에서 처리해야 함)
            setOutput('MD5 hash: ' + btoa(input).substring(0, 32));
            break;
          case 'sha256':
            setOutput('SHA256 hash: ' + btoa(input).substring(0, 64));
            break;
          default:
            setOutput(input);
        }
      } else {
        switch (cryptoType) {
          case 'base64':
            setOutput(atob(input));
            break;
          case 'hex':
            setOutput(input.match(/.{1,2}/g)?.map(hex => String.fromCharCode(parseInt(hex, 16))).join('') || '');
            break;
          case 'url':
            setOutput(decodeURIComponent(input));
            break;
          default:
            setOutput('Decode not supported for this type');
        }
      }
    } catch (e: any) {
      setOutput('Error: ' + e.message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Crypto Tool
        </h3>
        <div className="flex items-center gap-2">
          <Select value={cryptoType} onValueChange={setCryptoType}>
            <SelectTrigger className="font-mono text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base64">Base64</SelectItem>
              <SelectItem value="hex">Hex</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="md5">MD5</SelectItem>
              <SelectItem value="sha256">SHA256</SelectItem>
            </SelectContent>
          </Select>
          <Select value={operation} onValueChange={(v: 'encode' | 'decode') => setOperation(v)}>
            <SelectTrigger className="font-mono text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="encode">Encode</SelectItem>
              <SelectItem value="decode">Decode</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Input</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono text-xs min-h-[150px]"
            placeholder="Enter text to encode/decode"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-mono text-xs text-muted-foreground">Output</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="font-mono text-xs h-6"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <Textarea
            value={output}
            readOnly
            className="font-mono text-xs min-h-[150px] bg-background/60"
            placeholder="Result will appear here"
          />
        </div>
      </div>
      <Button onClick={process} className="font-mono text-xs mt-3 w-full">
        {operation === 'encode' ? <Lock className="h-3 w-3 mr-2" /> : <Unlock className="h-3 w-3 mr-2" />}
        {operation === 'encode' ? 'Encode' : 'Decode'}
      </Button>
    </div>
  );
};

// 헥스 덤프 뷰어
export const HexDumpBlock = ({ data }: { data?: string }) => {
  const [input, setInput] = useState(data || '');
  const [hexView, setHexView] = useState<string>('');

  const generateHexDump = () => {
    const bytes = new TextEncoder().encode(input);
    let output = '';
    for (let i = 0; i < bytes.length; i += 16) {
      const hex = Array.from(bytes.slice(i, i + 16))
        .map(b => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
      const ascii = Array.from(bytes.slice(i, i + 16))
        .map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.')
        .join('');
      const offset = i.toString(16).padStart(8, '0').toUpperCase();
      output += `${offset}  ${hex.padEnd(48)}  |${ascii}|\n`;
    }
    setHexView(output);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">Hex Dump Viewer</h3>
        <Button onClick={generateHexDump} className="font-mono text-xs">
          Generate
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Input</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="font-mono text-xs min-h-[200px]"
            placeholder="Enter data to view as hex dump"
          />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Hex Dump</label>
          <pre className="font-mono text-xs bg-background/60 p-3 rounded border border-border/30 min-h-[200px] overflow-x-auto text-foreground">
            {hexView || 'Click Generate to view hex dump'}
          </pre>
        </div>
      </div>
    </div>
  );
};

// SQL Injection 테스트 블록
export const SqlInjectionBlock = ({ query }: { query?: string }) => {
  const [sqlQuery, setSqlQuery] = useState(query || "SELECT * FROM users WHERE id = '");
  const [injection, setInjection] = useState("1' OR '1'='1");
  const [result, setResult] = useState<any>(null);
  const [vulnerable, setVulnerable] = useState<boolean | null>(null);

  const testInjection = () => {
    const fullQuery = sqlQuery + injection + "'";
    setResult({ query: fullQuery });
    
    // 간단한 취약점 감지 시뮬레이션
    const dangerous = ['OR', 'UNION', '--', ';', 'DROP', 'DELETE', 'UPDATE'].some(
      keyword => injection.toUpperCase().includes(keyword)
    );
    setVulnerable(dangerous);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">SQL Injection Test</h3>
        <Button onClick={testInjection} className="font-mono text-xs">
          Test
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">SQL Query</label>
          <Input
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            className="font-mono text-xs"
            placeholder="SELECT * FROM users WHERE id = '"
          />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Injection Payload</label>
          <Input
            value={injection}
            onChange={(e) => setInjection(e.target.value)}
            className="font-mono text-xs"
            placeholder="1' OR '1'='1"
          />
        </div>
        {result && (
          <div className="p-3 bg-background/60 rounded border border-border/30">
            <div className="font-mono text-xs text-muted-foreground mb-2">Final Query:</div>
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap break-words">
              {result.query}
            </pre>
            {vulnerable !== null && (
              <div className={`mt-2 font-mono text-xs ${vulnerable ? 'text-red-500' : 'text-green-500'}`}>
                {vulnerable ? '⚠ Vulnerable to SQL Injection!' : '✓ Query appears safe'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// XSS 페이로드 테스트 블록
export const XssTestBlock = ({ payload }: { payload?: string }) => {
  const [xssPayload, setXssPayload] = useState(payload || '<script>alert("XSS")</script>');
  const [rendered, setRendered] = useState('');
  const [safe, setSafe] = useState<boolean | null>(null);

  const testXss = () => {
    // 안전한 렌더링 (실제로는 서버에서 처리)
    const sanitized = xssPayload
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    setRendered(sanitized);
    
    // XSS 패턴 감지
    const dangerous = /<script|javascript:|onerror=|onload=/i.test(xssPayload);
    setSafe(!dangerous);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">XSS Payload Test</h3>
        <Button onClick={testXss} className="font-mono text-xs">
          Test
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">XSS Payload</label>
          <Textarea
            value={xssPayload}
            onChange={(e) => setXssPayload(e.target.value)}
            className="font-mono text-xs min-h-[100px]"
            placeholder='<script>alert("XSS")</script>'
          />
        </div>
        {rendered && (
          <div className="p-3 bg-background/60 rounded border border-border/30">
            <div className="font-mono text-xs text-muted-foreground mb-2">Sanitized Output:</div>
            <div className="font-mono text-xs text-foreground whitespace-pre-wrap break-words">
              {rendered}
            </div>
            {safe !== null && (
              <div className={`mt-2 font-mono text-xs ${safe ? 'text-green-500' : 'text-red-500'}`}>
                {safe ? '✓ Payload is sanitized' : '⚠ Dangerous payload detected!'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 포트 스캐너 시뮬레이터
export const PortScannerBlock = ({ target, ports }: { target?: string; ports?: string }) => {
  const [host, setHost] = useState(target || 'localhost');
  const [portRange, setPortRange] = useState(ports || '1-100');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<Array<{ port: number; status: 'open' | 'closed' | 'filtered' }>>([]);

  const scanPorts = async () => {
    setScanning(true);
    setResults([]);
    
    const [start, end] = portRange.split('-').map(Number);
    const portsToScan = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    
    // 시뮬레이션 (실제로는 서버에서 처리)
    const simulatedResults = portsToScan.map(port => {
      // 랜덤하게 일부 포트만 열림으로 표시
      const isOpen = Math.random() > 0.9;
      return {
        port,
        status: isOpen ? 'open' : (Math.random() > 0.5 ? 'closed' : 'filtered') as 'open' | 'closed' | 'filtered',
      };
    });

    // 애니메이션 효과를 위해 순차적으로 표시
    for (let i = 0; i < simulatedResults.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      setResults([...simulatedResults.slice(0, i + 1)]);
    }
    
    setScanning(false);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">Port Scanner</h3>
        <Button onClick={scanPorts} disabled={scanning} className="font-mono text-xs">
          {scanning ? 'Scanning...' : 'Scan'}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Target</label>
          <Input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            className="font-mono text-xs"
            placeholder="localhost"
          />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Port Range</label>
          <Input
            value={portRange}
            onChange={(e) => setPortRange(e.target.value)}
            className="font-mono text-xs"
            placeholder="1-100"
          />
        </div>
      </div>
      {results.length > 0 && (
        <div className="p-3 bg-background/60 rounded border border-border/30 max-h-60 overflow-y-auto">
          <div className="font-mono text-xs text-muted-foreground mb-2">
            Scan Results ({results.filter(r => r.status === 'open').length} open):
          </div>
          <div className="space-y-1">
            {results.map((result) => (
              <div
                key={result.port}
                className={`font-mono text-xs p-1 rounded ${
                  result.status === 'open'
                    ? 'bg-green-500/20 text-green-500'
                    : result.status === 'filtered'
                    ? 'bg-yellow-500/20 text-yellow-500'
                    : 'bg-background/40 text-muted-foreground'
                }`}
              >
                Port {result.port}: {result.status.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 로그 분석기 블록
export const LogAnalyzerBlock = ({ logs }: { logs?: string }) => {
  const [logData, setLogData] = useState(logs || '');
  const [filter, setFilter] = useState('');
  const [filteredLogs, setFilteredLogs] = useState<string[]>([]);
  const [stats, setStats] = useState<{ total: number; errors: number; warnings: number }>({
    total: 0,
    errors: 0,
    warnings: 0,
  });

  const analyzeLogs = () => {
    const lines = logData.split('\n').filter(Boolean);
    const filtered = filter
      ? lines.filter(line => line.toLowerCase().includes(filter.toLowerCase()))
      : lines;

    setFilteredLogs(filtered);
    setStats({
      total: lines.length,
      errors: lines.filter(l => /error|fail|exception/i.test(l)).length,
      warnings: lines.filter(l => /warn|warning/i.test(l)).length,
    });
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">Log Analyzer</h3>
        <Button onClick={analyzeLogs} className="font-mono text-xs">
          Analyze
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Filter</label>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="font-mono text-xs"
            placeholder="Search in logs..."
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 bg-background/60 rounded border border-border/30">
            <div className="font-mono text-xs text-muted-foreground">Total</div>
            <div className="font-mono text-sm text-foreground">{stats.total}</div>
          </div>
          <div className="p-2 bg-background/60 rounded border border-border/30">
            <div className="font-mono text-xs text-muted-foreground">Errors</div>
            <div className="font-mono text-sm text-red-500">{stats.errors}</div>
          </div>
          <div className="p-2 bg-background/60 rounded border border-border/30">
            <div className="font-mono text-xs text-muted-foreground">Warnings</div>
            <div className="font-mono text-sm text-yellow-500">{stats.warnings}</div>
          </div>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Logs</label>
          <div className="p-3 bg-background/60 rounded border border-border/30 max-h-60 overflow-y-auto">
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
              {filteredLogs.length > 0 ? filteredLogs.join('\n') : logData || 'Enter logs to analyze'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

// 네트워크 패킷 분석기
export const PacketAnalyzerBlock = ({ packet }: { packet?: string }) => {
  const [packetData, setPacketData] = useState(packet || '');
  const [analyzed, setAnalyzed] = useState<any>(null);

  const analyzePacket = () => {
    // 간단한 패킷 분석 시뮬레이션
    const analysis = {
      source: '192.168.1.100',
      destination: '192.168.1.1',
      protocol: 'TCP',
      port: 80,
      flags: 'SYN',
      size: packetData.length,
      timestamp: new Date().toISOString(),
    };
    setAnalyzed(analysis);
  };

  return (
    <div className="my-4 border border-border/30 rounded-lg p-4 bg-background/40">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-sm font-semibold text-foreground">Packet Analyzer</h3>
        <Button onClick={analyzePacket} className="font-mono text-xs">
          Analyze
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="font-mono text-xs text-muted-foreground mb-2 block">Packet Data</label>
          <Textarea
            value={packetData}
            onChange={(e) => setPacketData(e.target.value)}
            className="font-mono text-xs min-h-[100px]"
            placeholder="Enter packet data (hex or raw)"
          />
        </div>
        {analyzed && (
          <div className="p-3 bg-background/60 rounded border border-border/30">
            <div className="font-mono text-xs text-muted-foreground mb-2">Analysis:</div>
            <pre className="font-mono text-xs text-foreground">
              {JSON.stringify(analyzed, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
