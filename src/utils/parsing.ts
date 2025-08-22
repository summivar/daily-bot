export interface ParsedAddCommand {
  rating?: number;
  text: string;
}

export interface ParsedTimeCommand {
  hour: number;
  minute: number;
}

export class CommandParser {
  static parseAddCommand(input: string): ParsedAddCommand | null {
    if (!input.trim()) return null;

    const parts = input.trim().split(/\s+/);
    
    // Check if first part is a rating (1-10)
    const firstPart = parts[0] || '';
    const rating = parseInt(firstPart, 10);
    
    if (!isNaN(rating) && rating >= 1 && rating <= 10) {
      // First part is rating, rest is text
      const text = parts.slice(1).join(' ').trim();
      
      if (!text) {
        return null; // Rating without text is invalid
      }
      
      return { rating, text };
    } else {
      // No rating, entire input is text
      const text = input.trim();
      return { text };
    }
  }

  static parseReminderTime(input: string): ParsedTimeCommand | null {
    const timeRegex = /^(\d{1,2}):(\d{2})$/;
    const match = input.match(timeRegex);
    
    if (!match) return null;
    
    const hour = parseInt(match[1] || '0', 10);
    const minute = parseInt(match[2] || '0', 10);
    
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    
    return { hour, minute };
  }


  static extractCommand(text: string): { command: string; args: string } {
    const trimmed = text.trim();
    const spaceIndex = trimmed.indexOf(' ');
    
    if (spaceIndex === -1) {
      return { command: trimmed.toLowerCase(), args: '' };
    }
    
    return {
      command: trimmed.substring(0, spaceIndex).toLowerCase(),
      args: trimmed.substring(spaceIndex + 1).trim(),
    };
  }

  static parseExportFormat(input?: string): 'csv' | 'json' | null {
    if (!input) return null;

    const format = input.toLowerCase().trim();
    
    if (format === 'csv' || format === 'json') {
      return format;
    }
    
    return null;
  }

}

export default CommandParser;