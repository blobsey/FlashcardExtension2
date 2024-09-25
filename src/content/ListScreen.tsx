import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select"

const ListScreen: React.FC = () => {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  )
}

export default ListScreen
