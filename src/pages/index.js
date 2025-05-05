import "react-querybuilder/dist/query-builder.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import QueryBuilder, { formatQuery } from "react-querybuilder";
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination";
import {
  FileUploadDropzone,
  FileUploadRoot,
} from "@/components/ui/file-upload"
import { Center, HStack, Table } from "@chakra-ui/react";
import mingo from "mingo";
import get from "lodash.get";
import { useRouter } from "next/router";

const defaultFields = [
  { name: "host", datatype: "string", label: "Host" },
  { name: "timing.dns", datatype: "number", label: "Dns (ms)" },
  { name: "timing.wait", datatype: "number", label: "Wait (ms)" },
  { name: "timing.delay", datatype: "number", label: "Delay (ms)" },
  { name: "timing.download", datatype: "number", label: "Download (ms)" },
  { name: "rank", datatype: "number", label: "Rank" },
  { name: "page.size", datatype: "number", label: "Size (bytes)" },
  { name: "page.static", datatype: "number", label: "Static (bytes)" },
  { name: "page.comment", datatype: "number", label: "Comment (Bytes)" },
  { name: "page.svgUrls", datatype: "number", label: "Svg Urls" },
  { name: "page.base64", datatype: "number", label: "Base64 (bytes)" },
  { name: "page.svg", datatype: "number", label: "Svg (bytes)" },
  { name: "page.template", datatype: "number", label: "Template (bytes)" },
  { name: "page.logo", datatype: "boolean", label: "Etbis logo" },
  { name: "details.founded", datatype: "string", label: "Founded" },
  { name: "details.size", datatype: "number", label: "Size" },
  {
    name: "details.industry",
    datatype: "string",
    label: "Industry",
    collect: true,
  },
  { name: "details.type", datatype: "string", label: "Type", collect: true },
  { name: "details.platform", datatype: "boolean", label: "Platform" },
  { name: "details.producer", datatype: "boolean", label: "Producer" },
  {
    name: "details.cargoLogicstics",
    datatype: "boolean",
    label: "Cargo and Logistic",
  },
  {
    name: "details.infastructure",
    datatype: "boolean",
    label: "Infastructure",
  },
  { name: "details.export", datatype: "boolean", label: "Export" },
  {
    name: "details.accessibilityCheck",
    datatype: "datetime",
    label: "Accessibility Check",
  },
  {
    name: "details.productionPlace",
    datatype: "boolean",
    label: "Production Place",
  },
  { name: "details.warehouse", datatype: "boolean", label: "Warehouse" },
];
export default function Home() {
  const [sortFields, setSortFields] = useState({
    "details.size": -1,
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [lines, setLines] = useState([]);
  const [query, setQuery] = useState({
    combinator: "and",
    rules: [],
  });
  const onChange = useCallback(async (e) => {
    const texts = await Promise.all(
      Array.from(e.target.files).map(
        (file) =>
          new Promise((resolve) => {
            const fileReader = new FileReader();
            fileReader.onload = function () {
              resolve(
                fileReader.result
                  .split("\n")
                  .filter(Boolean)
                  .map((x) => {
                    const line = JSON.parse(x);
                    line.details ||= {};
                    line.details.size = parseInt(
                      (line.details?.size ?? "0")
                        .replace(",", "")
                        .replace(/\D.*$/g, ""),
                    );
                    let groupMap = groups(line);
                    line.details.groups = [...groupMap.keys()].map(id => ({ id }));
                    line.details.cats = [...groupMap.values()].map(group => [...group.keys()]).flat().map(id => ({ id }));
                    return line;
                  }),
              );
            };
            fileReader.onerror = function () {
              resolve([]);
            };
            fileReader.readAsText(file);
          }),
      ),
    );
    setLines(texts.flat());
  });
  const router = useRouter();
  useEffect(() => {
    fetch(`${router.basePath}/data.json`)
      .then((res) => res.json())
      .then((data) => {
        setData(data);
      });
  }, []);
  const [pageLimit, setPageLimit] = useState(32);
  const [filtered, setFiltered] = useState({ count: 0, rows: [] });
  const mongoQuery = useMemo(
    () => new mingo.Query(formatQuery(query, { format: "mongodb_query", parseNumbers: true })),
    [query],
  );
  useEffect(() => {
    if (!query) {
      return;
    }
    const search = () => mongoQuery.find(lines);
    const result = {
      count: search().count(),
      rows: search()
        .sort(sortFields)
        .skip(pageLimit * (page - 1))
        .limit(pageLimit)
        .all(),
    };
    setFiltered(result);
  }, [lines, query, sortFields, page]);
  const fields = useMemo(() => {
    return [
      ...defaultFields,
      {
        name: 'details.cats.id',
        label: 'App Category',
        values: Object.entries(data?.categories ?? {}).map(([key, val]) => ({
          name: parseInt(key),
          label: val.name
        })),
        defaultOperator: 'in',
        valueEditorType: 'multiselect',
      },
      {
        name: 'details.groups.id',
        label: 'App Group',
        values: Object.entries(data?.groups ?? {}).map(([key, val]) => ({
          name: parseInt(key),
          label: val.name
        })),
        defaultOperator: 'in',
        valueEditorType: 'multiselect',
      },
      {
        name: "apps.name",
        label: "Apps",
        values: [
          ...new Set(
            lines
              .map((line) => line.apps?.map((app) => app.name))
              .flat()
              .filter(Boolean) ?? [],
          ),
        ]
          .sort()
          .map((name) => ({
            name,
            label: name,
          })),
        defaultOperator: "in",
        valueEditorType: "multiselect",
      },
    ].map((field) => ({
      ...(field.datatype != "boolean" ? {} : { valueEditorType: "checkbox" }),
      ...(!field.collect
        ? {}
        : {
          values: [
            ...new Set(
              lines.map((line) => get(line, field.name)).filter(Boolean),
            ),
          ]
            .sort()
            .map((name) => ({
              name,
              label: name,
            })),
          defaultOperator: "in",
          valueEditorType: "multiselect",
        }),
      ...field,
    }));
  }, [lines, data]);
  return (
    <>
      {lines.length != 0 ? null : (
        <Center>
          <FileUploadRoot maxW="xl" alignItems="stretch" maxFiles={10} onChange={onChange}>
            <FileUploadDropzone
              label="Drag and drop here to upload"
              description="wapp.jsonl"
            />
          </FileUploadRoot>
        </Center>
      )}
      {lines.length == 0 ? null : (
        <>
          <QueryBuilder fields={fields} onQueryChange={setQuery} />
          {filtered.count == 0 ? null : (
            <>
              <Table.ScrollArea
                borderWidth="1px"
                rounded="md"
                height={`${pageLimit}em`}
              >
                <Table.Root size="sm" striped stickyHeader>
                  <Table.Header>
                    <Table.Row>
                      <Table.Cell colSpan={defaultFields.length + Object.keys(data.groups).length}>{`Founded ${filtered.count}/${lines.length} items`}</Table.Cell>
                    </Table.Row>
                    <Table.Row bg="bg.subtle">
                      {defaultFields.map((field) => (
                        <Table.ColumnHeader
                          key={field.name}
                          onClick={() =>
                            setSortFields((sortFields) => ({
                              [field.name]: (sortFields[field.name] ?? 1) * -1,
                            }))
                          }
                        >
                          {field.label}
                        </Table.ColumnHeader>
                      ))}
                      {Object.values(data.groups).map((group) => (
                        <Table.ColumnHeader key={group.name}>
                          {group.name}
                        </Table.ColumnHeader>
                      ))}
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {filtered.rows.map((line) => Company(line, data))}
                  </Table.Body>
                </Table.Root>
              </Table.ScrollArea>
              <PaginationRoot
                count={filtered.count}
                pageSize={pageLimit}
                defaultPage={1}
                onPageChange={(e) => setPage(e.page)}
              >
                <HStack>
                  <PaginationPrevTrigger />
                  <PaginationItems />
                  <PaginationNextTrigger />
                </HStack>
              </PaginationRoot>
            </>
          )}
        </>
      )}
    </>
  );
}
function groups(line) {
  return (
    line.apps?.reduce((acc, app) => {
      for (let idx = 0; idx < app.groups?.length; idx++) {
        const groups = app.groups[idx];
        for (const group of groups) {
          const groupEntry = acc.get(group) || new Map();
          const catEntry = groupEntry.get(app.cats[idx]) || new Map();
          acc.set(group, groupEntry);
          groupEntry.set(app.cats[idx], catEntry);
          catEntry.set(app.name, app);
        }
      }
      return acc;
    }, new Map()) || new Map()
  );
}
function Company(line, data) {
  const empty = {
    boolean: (key) => (get(line, key) ? "Yes" : "No"),
    number: (key) => get(line, key) || "0",
    string: (key) => get(line, key) || "",
    datetime: (key) => get(line, key) || "",
  };
  const groupMap = groups(line);
  return (
    <Table.Row key={line.host}>
      {defaultFields.map((field) => (
        <Table.Cell
          key={`${line.host}-${field.name}`}
          textAlign={field.datatype == "number" ? "end" : "start"}
        >
          {empty[field.datatype](field.name)}
        </Table.Cell>
      ))}
      {Object.keys(data.groups).map((idx) => (
        <Table.Cell key={`${line.host}-${idx}`}>
          {[
            ...new Set(
              [...(groupMap.get(parseInt(idx))?.values() ?? [])]
                .map((cat) => [...cat.values()].map((app) => app.name))
                .flat(),
            ),
          ].sort().join(",")}
        </Table.Cell>
      ))}
    </Table.Row>
  );
}
