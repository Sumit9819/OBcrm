import { TabsContent } from "@/components/ui/tabs"
import { FileText } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"

interface Document {
    id: string
    name: string
    doc_type?: string
    expiry_date?: string
    created_at: string
}

interface TabDocumentsProps {
    documents: Document[]
}

export function TabDocuments({ documents }: TabDocumentsProps) {
    return (
        <TabsContent value="documents" className="m-0 space-y-4 outline-none">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">Uploaded Documents</h3>
            </div>
            {documents.length === 0 ? (
                <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                    No documents uploaded. <Link href="/dashboard/documents" className="text-primary hover:underline font-medium">Go to Documents &rarr;</Link>
                </div>
            ) : (
                <div className="rounded-lg border overflow-hidden bg-background">
                    {documents.map((d, i) => (
                        <div key={d.id} className={`flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors ${i < documents.length - 1 ? 'border-b' : ''}`}>
                            <div className="bg-blue-100 p-2 rounded-md">
                                <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                            </div>
                            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{d.name}</p><p className="text-xs text-muted-foreground capitalize">{d.doc_type?.replace('_', ' ')}{d.expiry_date ? ` \u00b7 Expires ${format(new Date(d.expiry_date), 'MMM dd, yyyy')}` : ''}</p></div>
                            <div className="text-right">
                                <span className="text-xs text-muted-foreground block">{format(new Date(d.created_at), 'MMM dd, yyyy')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </TabsContent>
    )
}
