export function exportToCSV(data: Record<string, any>[], filename: string) {
    if (!data || data.length === 0) return

    const headers = Object.keys(data[0])
    const csv = [
        headers.join(','),
        ...data.map(row =>
            headers.map(h => {
                const val = (row[h] ?? '').toString()
                // Escape quotes and wrap in quotes if contains comma/quote/newline
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    return `"${val.replace(/"/g, '""')}"`
                }
                return val
            }).join(',')
        )
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}
