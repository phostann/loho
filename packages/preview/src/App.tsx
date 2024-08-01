import { Masonry } from "@hid/components";
import styles from "./App.module.scss";
import { useEffect, useRef, useState } from "react";
import "@hid/components/dist/style.css";
import { IHomeFeed } from "./types/types.ts";

function App() {
	const ref = useRef<HTMLDivElement>(null);

	const [data, setData] = useState<Array<IHomeFeed>>([]);

	useEffect(() => {
		fetch("/mock.json")
			.then((res) => res.json())
			.then((res) => {
				setData(res);
			})
			.catch((e) => {
				console.error(e);
			});
	}, []);

	useEffect(() => {
		// setTimeout(() => {
		// 	setColumn(3);
		// }, 3000 * 1);
		// setTimeout(() => {
		// 	setColumn(4);
		// }, 3000 * 2);
		// setTimeout(() => {
		// 	setColumn(5);
		// }, 3000 * 3);
		// setTimeout(() => {
		// 	setColumn(6);
		// }, 3000 * 4);
		// setTimeout(() => {
		// 	setColumn(7);
		// }, 3000 * 5);
		// setTimeout(() => {
		// 	setColumn(8);
		// }, 3000 * 6);
	}, []);

	return (
		<>
			<div className={styles.container} ref={ref}>
				{data.length !== 0 ? (
					<Masonry
						scrollContainer={ref}
						data={data.slice(0)}
						rowKey={"id"}
						gutter={20}
						columns={7}
						render={(item, width, x, y) => {
							return (
								<div
									className={styles.itemContainer}
									style={{
										width,
										transform: `translateX(${x}px) translateY(${y}px)`,
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
