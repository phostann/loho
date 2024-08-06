import { Masonry } from "@hid/components";
import styles from "./App.module.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import "@hid/components/dist/style.css";
import { IHomeFeed } from "./types/types.ts";

function App() {
	const ref = useRef<HTMLDivElement>(null);

	const [data, setData] = useState<Array<IHomeFeed>>([]);

	const [time, setTime] = useState(1);

	const [columns, setColumns] = useState(4);

	useEffect(() => {
		fetch("/mock.json")
			.then((res) => res.json())
			.then((res) => {
				console.log("res", res);
				setData(res);
			})
			.catch((e) => {
				console.error(e);
			});
	}, []);

	const total = useMemo(() => {
		return 15 * time;
	}, [time]);

	useEffect(() => {
		setTimeout(() => {
			// setColumns(5);
		}, 5000);
	}, []);

	return (
		<>
			<div className={styles.container} ref={ref}>
				{data.length !== 0 ? (
					<Masonry
						scrollContainer={window}
						containerRef={ref}
						data={data.slice(0)}
						rowKey={"id"}
						gutter={20}
						columnCount={columns}
						columnCountBreakPoints={{
							800: 2,
							1100: 3,
							1400: 4,
							1700: 5,
							2000: 6,
						}}
						// columnCountBreakpoints={{ 800: 2, 1100: 3, 1400: 4, 1700: 5, 2000: 6 }}
						onReachBottom={() => {
							// setTime((prev) => prev + 1);
						}}
						render={(item, width, x, y) => {
							return (
								<div
									className={styles.itemContainer}
									style={{
										width,
										transform: `translate(${x}px, ${y}px)`,
									}}
								>
									<img
										alt=""
										src={item.note_card.cover.url_default}
										style={{
											height:
												(width / item.note_card.cover.width) *
												item.note_card.cover.height,
										}}
									/>
									<div>{item.note_card.display_title}</div>
								</div>
							);
						}}
					/>
				) : null}
			</div>
		</>
	);
}

export default App;
