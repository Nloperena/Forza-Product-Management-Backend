import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Download, ExternalLink, X } from 'lucide-react';

interface PDFViewerProps {
  pdfUrl?: string;
  title: string;
  type: 'TDS' | 'SDS';
  onClose?: () => void;
  compact?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  pdfUrl, 
  title, 
  type,
  onClose,
  compact = false 
}) => {
  if (!pdfUrl) return null;

  const handleDownload = () => {
    window.open(pdfUrl, '_blank');
  };

  const typeLabel = type === 'TDS' ? 'Technical Data Sheet' : 'Safety Data Sheet';
  const typeColor = type === 'TDS' ? 'text-blue-600' : 'text-red-600';

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-primary-500 transition-colors">
        <FileText className={`h-5 w-5 ${typeColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{typeLabel}</p>
          <p className="text-xs text-gray-500 truncate">{title}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="p-2"
            title="View PDF"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="p-2"
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className={`h-5 w-5 ${typeColor}`} />
          <CardTitle className="text-lg">{typeLabel}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="aspect-[8.5/11] bg-gray-100 rounded-lg overflow-hidden">
          <iframe
            src={pdfUrl}
            className="w-full h-full"
            title={`${typeLabel} - ${title}`}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer;



