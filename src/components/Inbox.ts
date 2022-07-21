export type InboxOpts = {
    timestamp?: string;
    payload: string;
}

export class Inbox {
  private timestamp: string;

  private payload: string;

  PREFIX = '## [ ]';

  constructor(opts: InboxOpts) {
    const { timestamp, payload } = opts;
    this.timestamp = timestamp ?? (new Date()).toISOString();
    this.payload = payload;
  }

  public toString() {
    return `${this.PREFIX} ${this.timestamp} ${this.payload}\n\n\n`;
  }
}
