export const tablePageSizeOptions = ["20", "50", "100", "200"]

export const tableShowTotal = (total: number, range: [number, number]) => {
  if (!total) return "0-0共0条"
  return `${range[0]}-${range[1]}共${total}条`
}
